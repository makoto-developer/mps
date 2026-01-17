import { Router } from 'express';
import { AuthenticationController } from '../controllers/authentication.controller';

const router = Router();
const controller = new AuthenticationController();

router.post('/api/auth/register', controller.register);

export default router;