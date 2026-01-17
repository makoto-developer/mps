import { Router } from 'express';
import authenticationRouter from './authentication.routes';
import roomsRouter from './rooms.routes';

const router = Router();

router.use(authenticationRouter);
router.use(roomsRouter);

export default router;