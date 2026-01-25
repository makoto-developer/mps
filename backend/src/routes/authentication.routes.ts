import { Router } from 'express';
import { AuthenticationController } from '../controllers/authentication.controller';

const router = Router();
const controller = new AuthenticationController();

router.post('/api/auth/register', controller.register);
router.post('/api/auth/login', controller.login);

export default router;