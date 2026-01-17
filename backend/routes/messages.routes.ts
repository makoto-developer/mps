import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new MessagesController();

router.get('/api/rooms/:roomId/messages', authMiddleware, controller.list);
router.post('/api/rooms/:roomId/messages', authMiddleware, controller.create);

export default router;
