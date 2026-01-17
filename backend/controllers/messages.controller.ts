import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class MessagesController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      const messages = await prisma.message.findMany({
        where: { roomId },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      res.json({ messages });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;

      if (!content) {
        res.status(400).json({ error: 'content is required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if room exists
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          content,
          roomId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
