import { Request, Response, NextFunction } from 'express';

/**
 * Shape of an error that may carry an explicit HTTP status code.
 * Compatible with common patterns like http-errors and manual throws.
 */
interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Centralized Express error-handling middleware.
 *
 * Must be registered LAST in index.ts (after all routes) so Express
 * recognises it as a 4-argument error handler.
 *
 * - Uses err.status / err.statusCode when present.
 * - Falls back to 500 for everything else.
 * - Logs the full stack only in development.
 * - Never exposes raw stack traces in production.
 */
export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log stack only in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.stack ?? err.message);
  } else {
    console.error('[Error]', err.message);
  }

  const statusCode = err.status ?? err.statusCode ?? 500;

  const message =
    statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({ error: message });
}
