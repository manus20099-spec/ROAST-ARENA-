import { Router } from 'express';
import { INVESTORS, ROAST_LEVELS, TAGS } from '../lib/constants.js';

const router = Router();

router.get('/health', (req, res) => {
  return res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

router.get('/meta', (req, res) => {
  return res.status(200).json({
    tags: TAGS,
    roastLevels: ROAST_LEVELS,
    investors: INVESTORS,
  });
});

export default router;
