import { Router } from 'express';
import { verifyTokenMiddleware } from '../middleware/verifyToken';
import { requireRole } from '../middleware/auth';
import { submitRating } from '../controllers/ratingController';

const router = Router();

// POST /api/ratings — USER role only
router.post('/', verifyTokenMiddleware, requireRole('user'), submitRating);

export default router;
