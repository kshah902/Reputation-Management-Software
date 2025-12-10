import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Public routes
router.post('/register', authLimiter, authController.registerAgency.bind(authController));
router.post('/login', authLimiter, authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
