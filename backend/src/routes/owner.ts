import { Router } from 'express';
import { verifyTokenMiddleware } from '../middleware/verifyToken';
import { requireRole } from '../middleware/auth';
import { getOwnerStore, getOwnerRatings } from '../controllers/ownerController';

const router = Router();

// All owner routes require a valid JWT with the "owner" role
router.use(verifyTokenMiddleware, requireRole('owner'));

// GET /api/owner/store
router.get('/store', getOwnerStore);

// GET /api/owner/ratings
router.get('/ratings', getOwnerRatings);

export default router;
