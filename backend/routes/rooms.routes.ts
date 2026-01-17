import { Router } from 'express';
import { RoomsController } from '../controllers/rooms.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new RoomsController();

router.get('/api/rooms/', authMiddleware, controller.list);
router.post('/api/rooms/', authMiddleware, controller.create);

export default router;