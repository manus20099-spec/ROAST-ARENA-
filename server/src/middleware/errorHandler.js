import { AppError } from '../lib/errors.js';

/**
 * Central Express error handler (must have 4 parameters).
 * Translates every error type to a consistent JSON shape:
 *   { error: { code, message, details? } }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Known application errors — safe to expose to the client.
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  // Mongoose validation errors (e.g. schema constraints).
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', details },
    });
  }

  // Mongoose duplicate key (unique index violation).
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    return res.status(409).json({
      error: { code: 'CONFLICT', message: `A record with that ${field} already exists.` },
    });
  }

  // Multer file size error.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: { code: 'FILE_TOO_LARGE', message: 'File must be 2 MB or smaller.' },
    });
  }

  // Multer filter rejection.
  if (err.message?.startsWith('Only JPG')) {
    return res.status(400).json({
      error: { code: 'BAD_IMAGE', message: err.message },
    });
  }

  // Everything else: internal error — do not leak details.
  console.error('[error]', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
  });
}
