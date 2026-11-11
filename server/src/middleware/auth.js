/**
 * JWT authentication middleware.
 *
 * Both middlewares read the token from the `token` httpOnly cookie that is set
 * on login/signup. cookie-parser (mounted in app.js) populates req.cookies.
 *
 * On success  → req.userId is set to the string representation of the user _id.
 * requireAuth → throws 401 when no valid token is present.
 * optionalAuth → silently skips when no token is present or the token is invalid.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized } from '../lib/errors.js';

/**
 * Parse and verify the JWT cookie.
 * Returns the user id string on success, null otherwise.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractUserId(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return String(payload.sub);
  } catch {
    // expired, malformed, wrong secret — treat as "not authenticated"
    return null;
  }
}

/**
 * Require an authenticated Founder/user.
 * Throws a 401 AppError when the cookie is absent or the JWT is invalid.
 *
 * @type {import('express').RequestHandler}
 */
export function requireAuth(req, _res, next) {
  const userId = extractUserId(req);
  if (!userId) return next(unauthorized());
  req.userId = userId;
  return next();
}

/**
 * Identify the user when a valid JWT cookie is present but do NOT throw if it
 * is missing. Routes that want to show personalised data to logged-in users (e.g.
 * "did I vote for this?") but are still accessible to the public use this.
 *
 * @type {import('express').RequestHandler}
 */
export function optionalAuth(req, _res, next) {
  const userId = extractUserId(req);
  if (userId) req.userId = userId;
  return next();
}
