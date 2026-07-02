import { Router } from 'express';
import { verifyTokenMiddleware } from '../middleware/verifyToken';
import { requireRole } from '../middleware/auth';
import {
  getStats,
  getStores,
  getUsers,
  getUserById,
  createUser,
  createStore,
} from '../controllers/adminController';

const router = Router();

// ─── Guard: every admin route requires a valid JWT AND the "admin" role ───────
// JWT payload contains lowercase roles (set by roleMapper at login/signup time)
router.use(verifyTokenMiddleware, requireRole('admin'));

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', getStats);

// ─── Stores ───────────────────────────────────────────────────────────────────
router.get('/stores', getStores);
router.post('/stores', createStore);

// ─── Users ────────────────────────────────────────────────────────────────────
// Note: /users/:id must come AFTER /users to avoid route ambiguity
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);

export default router;
