/**
 * NoSQL injection guard.
 *
 * MongoDB operators such as `$where`, `$gt`, and `$regex` can be injected
 * via JSON bodies when user input is passed directly into a Mongoose query.
 * This middleware strips every key whose name starts with `$` or contains a
 * `.` (dot) from `req.body` before any route handler sees it.
 *
 * The recursion handles nested objects and arrays so deep payloads like
 *   { "user": { "$where": "..." } }
 * are cleaned at every level.
 */

/**
 * Recursively remove dangerous keys from an object or array.
 * Returns a new value; the original is not mutated.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function deepSanitize(value) {
  // Arrays: sanitize every element.
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item));
  }

  // Plain objects: drop bad keys, recurse into the rest.
  if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      // A key is "dangerous" if it begins with $ or contains a literal dot.
      if (key.startsWith('$') || key.includes('.')) continue;
      cleaned[key] = deepSanitize(val);
    }
    return cleaned;
  }

  // Primitives (string, number, boolean, null) pass through unchanged.
  return value;
}

/**
 * Express middleware. Replaces `req.body` with a sanitized copy.
 * Runs on every request; it is cheap (most bodies are small and clean).
 *
 * @type {import('express').RequestHandler}
 */
export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  return next();
}
