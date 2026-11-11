/** An error that is safe to show to the client. */
export class AppError extends Error {
  constructor(status, message, code = null, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, code = 'BAD_REQUEST', details) =>
  new AppError(400, message, code, details);
export const unauthorized = (message = 'Please log in first.') =>
  new AppError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'You are not allowed to do that.') =>
  new AppError(403, message, 'FORBIDDEN');
export const notFound = (message = 'Not found.') => new AppError(404, message, 'NOT_FOUND');
export const conflict = (message, code = 'CONFLICT') => new AppError(409, message, code);
export const tooMany = (message = 'Too many requests. Please slow down.') =>
  new AppError(429, message, 'RATE_LIMITED');
