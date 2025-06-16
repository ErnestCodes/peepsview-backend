import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Authentication routes
router.post('/login', AuthController.login as RequestHandler);
router.post('/register', AuthController.register as RequestHandler);
router.post('/logout', AuthController.logout as RequestHandler);
router.get('/session', AuthController.getSession as RequestHandler);
router.post('/reset-password', AuthController.resetPassword as RequestHandler);

export default router;
