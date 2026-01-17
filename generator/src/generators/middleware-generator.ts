/**
 * Middleware Generator
 * 認証・認可ミドルウェアを生成
 */

export class MiddlewareGenerator {
  generateAuthMiddleware(): string {
    return `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
`;
  }

  generateAdminMiddleware(): string {
    return `import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
`;
  }

  generate(): Map<string, string> {
    const files = new Map<string, string>();

    files.set('auth.middleware.ts', this.generateAuthMiddleware());
    files.set('admin.middleware.ts', this.generateAdminMiddleware());

    return files;
  }
}
