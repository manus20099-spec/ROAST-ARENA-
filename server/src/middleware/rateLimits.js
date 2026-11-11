/**
 * Rate-limit middleware presets.
 *
 * All limiters respect `config.rateLimitEnabled`. When disabled (e.g. in tests
 * or during local development with RATE_LIMIT_ENABLED=false) every exported
 * symbol is a no-op middleware so the rest of the code never has to branch.
 *
 * Windows:   standardHeaders: true  → Retry-After / RateLimit-* headers (RFC 6585)
 *            legacyHeaders: false   → no X-RateLimit-* headers
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/** No-op middleware used when rate limiting is disabled. */
function noOp(_req, _res, next) {
  return next();
}

/**
 * Build an express-rate-limit middleware, or return noOp when limiting is off.
 *
 * @param {import('express-rate-limit').Options} options
 * @returns {import('express').RequestHandler}
 */
function limiter(options) {
  if (!config.rateLimitEnabled) return noOp;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

/**
 * Login: 10 attempts per 15 minutes per IP.
 * Brute-force protection for the login endpoint.
 */
export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again in 15 minutes.' } },
});

/**
 * Signup: 5 registrations per hour per IP.
 * Prevents mass account creation from a single origin.
 */
export const signupLimiter = limiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many signup attempts. Please try again in an hour.' } },
});

/**
 * Comment POST: 3 comments per minute per IP.
 * Protects from comment-spam bursts.
 */
export const commentLimiter = limiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { error: { code: 'RATE_LIMITED', message: 'You are posting comments too fast. Please slow down.' } },
});

/**
 * File uploads: 10 uploads per hour per IP.
 * Covers both avatar and cover-image endpoints.
 */
export const uploadLimiter = limiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many uploads. Please try again in an hour.' } },
});
