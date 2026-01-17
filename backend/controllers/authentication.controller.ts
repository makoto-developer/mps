import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt.utils';

const prisma = new PrismaClient();

export class AuthenticationController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, nickname } = req.body;

      // Validation
      if (!email || !nickname) {
        res.status(400).json({ error: 'email and nickname are required' });
        return;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          nickname
        }
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}