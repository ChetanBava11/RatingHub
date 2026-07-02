import { Router } from 'express';
import { verifyTokenMiddleware } from '../middleware/verifyToken';
import { getStores } from '../controllers/storeController';

const router = Router();

// GET /api/stores — any authenticated user (ADMIN, USER, OWNER)
router.get('/', verifyTokenMiddleware, getStores);

export default router;
