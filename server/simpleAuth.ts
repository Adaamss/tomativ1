import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT_SECRET with proper error handling for production
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('⚠️  JWT_SECRET not set, using fallback (not secure for production)');
    return "tomati-secret-key-2024";
  }
  return secret;
})();

import type { User } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      return null;
    }
    return decoded;
  } catch (error) {
    // Log JWT verification errors for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.warn('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Also check for token in cookies
    const cookieToken = req.cookies?.token;
    const finalToken = token || cookieToken;

    if (!finalToken) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = verifyToken(finalToken);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user from database to have complete User object
    const { storage } = await import('./storage');
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    // Don't expose internal errors to client
    return res.status(500).json({ message: 'Authentication service unavailable' });
  }
};