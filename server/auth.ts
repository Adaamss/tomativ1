import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// JWT_SECRET with proper error handling for production
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('⚠️  JWT_SECRET not set, using fallback (not secure for production)');
    return 'your-super-secret-jwt-key-change-in-production';
  }
  return secret;
})();
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } | null {
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
}

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

    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };

    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    // Don't expose internal errors to client in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Authentication service unavailable' 
      : `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return res.status(500).json({ message });
  }
};

export function generateResetToken(): string {
  return jwt.sign({ type: 'reset', timestamp: Date.now() }, JWT_SECRET, { expiresIn: '1h' });
}