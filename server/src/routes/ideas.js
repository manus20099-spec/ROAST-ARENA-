import { Router } from 'express';
import { forbidden, notFound } from '../lib/errors.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/multerConfig.js';
import { commentLimiter, uploadLimiter } from '../middleware/rateLimits.js';
import { sanitizeBody } from '../middleware/sanitize.js';
import { validate } from '../middleware/validate.js';
import { Idea } from '../models/Idea.js';
import {
  addComment,
  deleteComment,
  founderHideComment,
  listComments,
  reportComment,
} from '../services/comments.js';
import {
  deleteIdea,
  getIdeaDetail,
  listIdeas,
  serializeIdeaCard,
  serializePitch,
  updateIdeaMeta,
} from '../services/ideas.js';
import { addPitch, createIdea, getPitchForViewer } from '../services/pitches.js';
import { removeImage, saveImage } from '../services/uploads.js';
import { toggleVote } from '../services/votes.js';
import {
  addCommentSchema,
  addPitchSchema,
  paginationSchema,
  postIdeaSchema,
  updateIdeaSchema,
} from '../validators.js';

const router = Router();

// ─── Ideas CRUD & Listing ───────────────────────────────────────────────────

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const parsedQuery = paginationSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination query parameters.',
          details: parsedQuery.error.issues,
        },
      });
    }

    const { page, limit, view, tag, q } = parsedQuery.data;
    const result = await listIdeas({
      view,
      tag,
      q,
      page,
      limit,
      viewerId: req.userId,
    });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, sanitizeBody, validate(postIdeaSchema), async (req, res, next) => {
  try {
    const { idea, pitch } = await createIdea({
      founderId: req.userId,
      ...req.body,
    });
    return res.status(202).json({
      idea: serializeIdeaCard(idea),
      pitch: serializePitch(pitch),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:ideaId', optionalAuth, async (req, res, next) => {
  try {
    const detail = await getIdeaDetail(req.params.ideaId, req.userId);
    return res.status(200).json(detail);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:ideaId', requireAuth, sanitizeBody, validate(updateIdeaSchema), async (req, res, next) => {
  try {
    const idea = await updateIdeaMeta({
      ideaId: req.params.ideaId,
      userId: req.userId,
      ...req.body,
    });
    return res.status(200).json({ idea: serializeIdeaCard(idea) });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:ideaId', requireAuth, async (req, res, next) => {
  try {
    await deleteIdea({ ideaId: req.params.ideaId, userId: req.userId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/:ideaId/cover', requireAuth, uploadLimiter, uploadSingle('cover'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'No cover image file uploaded.' } });
    }
    const idea = await Idea.findById(req.params.ideaId);
    if (!idea || idea.deletedAt) throw notFound('Idea not found.');
    if (String(idea.founder) !== String(req.userId)) {
      throw forbidden('Only the founder can change the cover image.');
    }

    const publicPath = await saveImage(req.file.buffer, 'covers');
    const oldPath = idea.coverImagePath;
    idea.coverImagePath = publicPath;
    await idea.save();

    if (oldPath) {
      await removeImage(oldPath);
    }

    return res.status(200).json({ coverImagePath: publicPath });
  } catch (err) {
    return next(err);
  }
});

// ─── Voting ─────────────────────────────────────────────────────────────────

router.post('/:ideaId/vote', requireAuth, async (req, res, next) => {
  try {
    const result = await toggleVote({ ideaId: req.params.ideaId, userId: req.userId });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

// ─── Pitches ────────────────────────────────────────────────────────────────

router.post('/:ideaId/pitches', requireAuth, sanitizeBody, validate(addPitchSchema), async (req, res, next) => {
  try {
    const { idea, pitch } = await addPitch({
      ideaId: req.params.ideaId,
      userId: req.userId,
      ...req.body,
    });
    return res.status(202).json({
      idea: serializeIdeaCard(idea),
      pitch: serializePitch(pitch),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:ideaId/pitches/:pitchId', optionalAuth, async (req, res, next) => {
  try {
    const { pitch, roasts, idea } = await getPitchForViewer(req.params.pitchId, req.userId);
    return res.status(200).json({
      pitch: serializePitch(pitch, roasts),
      idea: serializeIdeaCard(idea),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── Comments ───────────────────────────────────────────────────────────────

router.get('/:ideaId/comments', optionalAuth, async (req, res, next) => {
  try {
    const comments = await listComments(req.params.ideaId);
    return res.status(200).json({ comments });
  } catch (err) {
    return next(err);
  }
});

router.post('/:ideaId/comments', requireAuth, commentLimiter, sanitizeBody, validate(addCommentSchema), async (req, res, next) => {
  try {
    const comment = await addComment({
      ideaId: req.params.ideaId,
      authorId: req.userId,
      body: req.body.body,
    });
    return res.status(201).json({ comment });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:ideaId/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    await deleteComment({ commentId: req.params.commentId, userId: req.userId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/:ideaId/comments/:commentId/hide', requireAuth, async (req, res, next) => {
  try {
    await founderHideComment({ commentId: req.params.commentId, userId: req.userId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/:ideaId/comments/:commentId/report', requireAuth, async (req, res, next) => {
  try {
    const result = await reportComment({ commentId: req.params.commentId, reporterId: req.userId });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;
