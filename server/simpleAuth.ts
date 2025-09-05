import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "tomati-secret-key-2024";

import type { User } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
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
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Also check for token in cookies
  const cookieToken = req.cookies?.token;
  const finalToken = token || cookieToken;

  if (!finalToken) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const decoded = verifyToken(finalToken);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Get user from database to have complete User object
  try {
    const { storage } = await import('./storage');
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error getting user for authentication:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};