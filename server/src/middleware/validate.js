/**
 * Zod-based request body validation middleware factory.
 *
 * Usage:
 *   router.post('/foo', validate(fooSchema), handler)
 *
 * On validation failure the middleware throws a 400 AppError whose `details`
 * field contains the flattened Zod issue list so the client can render
 * per-field error messages.
 */

import { badRequest } from '../lib/errors.js';

/**
 * Returns an Express middleware that validates `req.body` against the given
 * Zod schema. When validation passes `req.body` is replaced with the parsed
 * (and coerced/defaulted) value. When it fails a 400 AppError is thrown.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return function validateBody(req, _res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Collect the human-readable issue list to send to the client.
      const details = result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      return next(badRequest('Validation failed.', 'VALIDATION_ERROR', details));
    }
    // Replace raw body with the coerced, default-filled value.
    req.body = result.data;
    return next();
  };
}
