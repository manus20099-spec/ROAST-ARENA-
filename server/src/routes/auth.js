import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimits.js';
import { sanitizeBody } from '../middleware/sanitize.js';
import { validate } from '../middleware/validate.js';
import { User } from '../models/User.js';
import { cookieOptions, login, signToken, signup } from '../services/users.js';
import { loginSchema, signupSchema } from '../validators.js';

const router = Router();

router.post('/signup', signupLimiter, sanitizeBody, validate(signupSchema), async (req, res, next) => {
  try {
    const user = await signup(req.body);
    const token = signToken(user._id);
    res.cookie('token', token, cookieOptions());
    return res.status(201).json({
      user: {
        id: String(user._id),
        displayName: user.displayName,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', loginLimiter, sanitizeBody, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await login(req.body);
    const token = signToken(user._id);
    res.cookie('token', token, cookieOptions());
    return res.status(200).json({
      user: {
        id: String(user._id),
        displayName: user.displayName,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.status(200).json({ ok: true });
});

router.get('/me', optionalAuth, async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(200).json({ user: null });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(200).json({ user: null });
    }
    return res.status(200).json({ user: user.toPublic() });
  } catch (err) {
    return next(err);
  }
});

export default router;
