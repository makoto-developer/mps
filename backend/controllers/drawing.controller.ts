import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class DrawingController {
  async getStrokes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      const strokes = await prisma.drawingStroke.findMany({
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

      res.json({ strokes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createStroke(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { tool, color, width, points } = req.body;
      const userId = req.user?.id;

      if (!tool || !color || !width || !points) {
        res.status(400).json({ error: 'tool, color, width, and points are required' });
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

      const stroke = await prisma.drawingStroke.create({
        data: {
          tool,
          color,
          width: parseInt(width),
          points: JSON.stringify(points),
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
        stroke,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async clearStrokes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if room exists and get room details
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Authorization: Only room creator or admin can clear strokes
      if (room.createdById !== userId && userRole !== 'ADMIN') {
        res.status(403).json({ 
          error: 'Forbidden: Only the room creator or admin can clear the canvas' 
        });
        return;
      }

      // Delete all strokes for this room
      await prisma.drawingStroke.deleteMany({
        where: { roomId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
