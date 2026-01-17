import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class RoomsController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await prisma.room.findMany();
      res.json({ rooms: items });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, theme } = req.body;
      const userId = req.user?.id;

      if (!title || !theme) {
        res.status(400).json({ error: 'title and theme are required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const room = await prisma.room.create({
        data: {
          title,
          theme,
          createdById: userId,
        },
      });

      res.status(201).json({
        success: true,
        room: {
          id: room.id,
          title: room.title,
          theme: room.theme,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}