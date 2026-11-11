import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, markAllRead, markRead } from '../services/notifications.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await listNotifications(req.userId);
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
});

router.post('/:notifId/read', requireAuth, async (req, res, next) => {
  try {
    await markRead(req.userId, req.params.notifId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await markAllRead(req.userId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
