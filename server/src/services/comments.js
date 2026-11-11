import { COMMENT_RULES } from '../lib/constants.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { findBlockedTerm } from '../lib/moderation.js';
import { Comment } from '../models/Comment.js';
import { Idea } from '../models/Idea.js';
import { Report } from '../models/Report.js';
import { emitToIdea } from '../realtime.js';
import { notify } from './notifications.js';

const visible = { deletedAt: null, hiddenBy: null };

export function serializeComment(c, author) {
  return {
    id: String(c._id),
    idea: String(c.idea),
    body: c.body,
    createdAt: c.createdAt,
    author: author
      ? { id: String(author._id), displayName: author.displayName, avatarPath: author.avatarPath }
      : null,
  };
}

async function loadLiveIdea(ideaId) {
  const idea = await Idea.findById(ideaId).lean();
  if (!idea || idea.deletedAt) throw notFound('Idea not found.');
  return idea;
}

export async function listComments(ideaId) {
  await loadLiveIdea(ideaId);
  const comments = await Comment.find({ idea: ideaId, ...visible })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate('author', 'displayName avatarPath')
    .lean();
  return comments.map((c) => serializeComment(c, c.author));
}

export async function addComment({ ideaId, authorId, body }) {
  const idea = await loadLiveIdea(ideaId);
  if (findBlockedTerm(body)) {
    throw badRequest('Your comment contains language we do not allow.', 'BLOCKED_LANGUAGE');
  }

  const comment = await Comment.create({ idea: ideaId, author: authorId, body });
  await Idea.updateOne({ _id: ideaId }, { $inc: { commentCount: 1 } });

  // Founders hear about other people's comments, not their own.
  if (String(idea.founder) !== String(authorId)) {
    await notify({
      user: idea.founder,
      type: 'comment',
      idea: idea._id,
      data: { title: idea.title, commentId: String(comment._id) },
    });
  }

  const populated = await Comment.findById(comment._id).populate('author', 'displayName avatarPath').lean();
  const payload = serializeComment(populated, populated.author);
  emitToIdea(String(ideaId), 'comment:created', payload);
  return payload;
}

async function hide(comment, by) {
  const wasVisible = !comment.deletedAt && !comment.hiddenBy;
  comment.hiddenBy = by;
  await comment.save();
  if (wasVisible) await Idea.updateOne({ _id: comment.idea }, { $inc: { commentCount: -1 } });
  emitToIdea(String(comment.idea), 'comment:removed', { id: String(comment._id) });
}

/** The author deletes their own comment (soft delete). */
export async function deleteComment({ commentId, userId }) {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.deletedAt) throw notFound('Comment not found.');
  if (String(comment.author) !== String(userId)) throw forbidden('You can only delete your own comments.');

  const wasVisible = !comment.hiddenBy;
  comment.deletedAt = new Date();
  await comment.save();
  if (wasVisible) await Idea.updateOne({ _id: comment.idea }, { $inc: { commentCount: -1 } });
  emitToIdea(String(comment.idea), 'comment:removed', { id: String(comment._id) });
}

/** The idea's founder hides any comment on their own idea. */
export async function founderHideComment({ commentId, userId }) {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.deletedAt) throw notFound('Comment not found.');
  const idea = await loadLiveIdea(comment.idea);
  if (String(idea.founder) !== String(userId)) {
    throw forbidden('Only the idea\'s founder can hide comments.');
  }
  if (comment.hiddenBy) return;

  await hide(comment, 'founder');
  if (String(comment.author) !== String(userId)) {
    await notify({
      user: comment.author,
      type: 'comment_hidden',
      idea: idea._id,
      data: { title: idea.title, by: 'founder' },
    });
  }
}

/** Report a comment. Enough reports hide it automatically. */
export async function reportComment({ commentId, reporterId }) {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.deletedAt || comment.hiddenBy) throw notFound('Comment not found.');
  if (String(comment.author) === String(reporterId)) throw forbidden('You cannot report your own comment.');

  try {
    await Report.create({ comment: commentId, reporter: reporterId });
  } catch (err) {
    if (err?.code === 11000) throw conflict('You already reported this comment.', 'ALREADY_REPORTED');
    throw err;
  }

  const updated = await Comment.findOneAndUpdate(
    { _id: commentId },
    { $inc: { reportCount: 1 } },
    { new: true }
  );

  if (updated.reportCount >= COMMENT_RULES.reportsToHide && !updated.hiddenBy) {
    await hide(updated, 'reports');
    const idea = await Idea.findById(updated.idea).select('title').lean();
    await notify({
      user: updated.author,
      type: 'comment_hidden',
      idea: updated.idea,
      data: { title: idea?.title ?? '', by: 'reports' },
    });
    return { hidden: true };
  }
  return { hidden: false };
}
