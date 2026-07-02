import { Router } from 'express';
import { signup, login, changePassword } from '../controllers/authController';
import { verifyTokenMiddleware } from '../middleware/verifyToken';

const router = Router();

// POST /api/auth/signup — public
router.post('/signup', signup);

// POST /api/auth/login — public
router.post('/login', login);

// PUT /api/auth/password — protected
router.put('/password', verifyTokenMiddleware, changePassword);

export default router;
