import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/multerConfig.js';
import { uploadLimiter } from '../middleware/rateLimits.js';
import { sanitizeBody } from '../middleware/sanitize.js';
import { validate } from '../middleware/validate.js';
import { removeImage, saveImage } from '../services/uploads.js';
import { getProfile, setAvatarPath, updateProfile, votedIdeaIds } from '../services/users.js';
import { updateProfileSchema } from '../validators.js';

const router = Router();

router.get('/me/votes', requireAuth, async (req, res, next) => {
  try {
    const ideaIds = await votedIdeaIds(req.userId);
    return res.status(200).json({ ideaIds });
  } catch (err) {
    return next(err);
  }
});

router.patch('/me', requireAuth, sanitizeBody, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const updated = await updateProfile(req.userId, req.body);
    return res.status(200).json({ user: updated.toPublic() });
  } catch (err) {
    return next(err);
  }
});

router.post('/me/avatar', requireAuth, uploadLimiter, uploadSingle('avatar'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'No image file uploaded.' } });
    }
    const publicPath = await saveImage(req.file.buffer, 'avatars');
    const { previous } = await setAvatarPath(req.userId, publicPath);
    if (previous) {
      await removeImage(previous);
    }
    return res.status(200).json({ avatarPath: publicPath });
  } catch (err) {
    return next(err);
  }
});

router.get('/:displayName', async (req, res, next) => {
  try {
    const profile = await getProfile(req.params.displayName);
    return res.status(200).json(profile);
  } catch (err) {
    return next(err);
  }
});

export default router;
