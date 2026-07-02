import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: verify Bearer JWT and attach decoded payload to req.user.
 * Returns 401 if the token is missing or invalid.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized: no token provided' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized: invalid or expired token' });
  }
}

/**
 * Middleware factory: restrict access to specific roles.
 * Must be used AFTER `authenticate`.
 *
 * Example: router.delete('/users/:id', authenticate, requireRole('admin'), ...)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
}
