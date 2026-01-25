import { Router } from 'express';
import { DrawingController } from '../controllers/drawing.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new DrawingController();

router.get('/api/rooms/:roomId/strokes', authMiddleware, controller.getStrokes);
router.post('/api/rooms/:roomId/strokes', authMiddleware, controller.createStroke);
router.delete('/api/rooms/:roomId/strokes', authMiddleware, controller.clearStrokes);

export default router;
