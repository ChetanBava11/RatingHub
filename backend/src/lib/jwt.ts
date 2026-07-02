import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Sign a JWT token for the given payload.
 * Default expiry: 7 days.
 */
export function signToken(
  payload: JwtPayload,
  options: SignOptions = { expiresIn: '7d' }
): string {
  return jwt.sign(payload, getSecret(), options);
}

/**
 * Verify and decode a JWT token.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
