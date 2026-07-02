import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';

/**
 * Middleware: read Bearer token from Authorization header,
 * verify JWT, attach decoded { id, role, email } to req.user.
 *
 * Returns 401 if token is missing or invalid.
 */
export function verifyTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized: no token provided.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    // Attach with normalized shape: id maps from userId in JwtPayload
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized: invalid or expired token.' });
  }
}
