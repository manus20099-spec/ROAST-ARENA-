import { INVESTOR_KEYS, PAGE_SIZE, TAGS } from '../lib/constants.js';
import { forbidden, notFound } from '../lib/errors.js';
import { Idea } from '../models/Idea.js';
import { Pitch } from '../models/Pitch.js';
import { Roast } from '../models/Roast.js';
import { getLeaderboardPage, recomputeAndNotify } from './ideaScore.js';
import { hasVoted } from './votes.js';

export function serializeRoast(r) {
  return {
    id: String(r._id),
    investor: r.investor,
    score: r.score,
    roast: r.roast,
    tip: r.tip,
    offer: r.offer,
    source: r.source, // 'ai' | 'fallback' | 'seed' — the UI labels fallback roasts
  };
}

export function serializePitch(p, roasts = []) {
  return {
    id: String(p._id),
    version: p.version,
    problem: p.problem,
    solution: p.solution,
    customer: p.customer,
    roastLevel: p.roastLevel,
    status: p.status,
    flagged: p.flagged,
    flagReason: p.flagReason,
    aiAverage: p.aiAverage,
    createdAt: p.createdAt,
    completedAt: p.completedAt,
    roasts: roasts.map(serializeRoast),
  };
}

export function serializeIdeaCard(idea, extra = {}) {
  const founder = idea.founder && idea.founder._id ? idea.founder : null;
  return {
    id: String(idea._id),
    title: idea.title,
    tags: idea.tags,
    coverImagePath: idea.coverImagePath,
    previewProblem: idea.previewProblem,
    score: idea.score,
    aiScore: idea.aiScore,
    voteCount: idea.voteCount,
    commentCount: idea.commentCount,
    pitchCount: idea.pitchCount,
    onLeaderboard: Boolean(idea.rankedPitch),
    createdAt: idea.createdAt,
    founder: founder
      ? { id: String(founder._id), displayName: founder.displayName, avatarPath: founder.avatarPath }
      : { id: String(idea.founder) },
    ...extra,
  };
}

/** Browse Ideas: the leaderboard, the newest ideas, or the viewer's own. */
export async function listIdeas({ view = 'leaderboard', tag, q, page = 1, limit = PAGE_SIZE, viewerId }) {
  if (view === 'leaderboard' && !tag && !q) {
    const { items, total, startRank } = await getLeaderboardPage({ page, limit });
    return {
      items: items.map((idea, i) => serializeIdeaCard(idea, { rank: startRank + i })),
      page,
      limit,
      total,
    };
  }

  const filter = { deletedAt: null };
  if (view === 'mine') {
    if (!viewerId) throw forbidden('Log in to see your ideas.');
    filter.founder = viewerId;
  } else {
    filter.rankedPitch = { $type: 'objectId' }; // New and Leaderboard only show ranked ideas
  }
  if (tag && TAGS.includes(tag)) filter.tags = tag;
  if (q) filter.$text = { $search: q };

  const sort =
    view === 'leaderboard'
      ? { score: -1, rankedAt: 1, _id: 1 }
      : q
        ? { score: { $meta: 'textScore' } }
        : { createdAt: -1, _id: -1 };

  const [items, total] = await Promise.all([
    Idea.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('founder', 'displayName avatarPath')
      .lean(),
    Idea.countDocuments(filter),
  ]);

  return { items: items.map((idea) => serializeIdeaCard(idea)), page, limit, total };
}

/**
 * One Idea with its Ranked Pitch's roasts and the full Pitch history (score changes).
 * Pending and flagged pitches appear only to the founder.
 */
export async function getIdeaDetail(ideaId, viewerId) {
  const idea = await Idea.findById(ideaId).populate('founder', 'displayName avatarPath').lean();
  if (!idea || idea.deletedAt) throw notFound('Idea not found.');

  const isFounder = viewerId && String(idea.founder._id) === String(viewerId);

  // Founders see everything. Everyone else needs a ranked idea to see it at all.
  if (!isFounder && !idea.rankedPitch) throw notFound('Idea not found.');

  const pitches = await Pitch.find({ idea: ideaId }).sort({ version: 1 }).lean();
  const roasts = await Roast.find({ idea: ideaId }).lean();
  const roastsByPitch = new Map();
  for (const r of roasts) {
    const key = String(r.pitch);
    if (!roastsByPitch.has(key)) roastsByPitch.set(key, []);
    roastsByPitch.get(key).push(r);
  }
  const sortRoasts = (list = []) =>
    [...list].sort((a, b) => INVESTOR_KEYS.indexOf(a.investor) - INVESTOR_KEYS.indexOf(b.investor));

  const visiblePitches = pitches.filter((p) => isFounder || (p.status === 'complete' && !p.flagged));

  // Score history: how each complete pitch compared with the one before it.
  let previous = null;
  const history = visiblePitches.map((p) => {
    const entry = {
      id: String(p._id),
      version: p.version,
      status: p.status,
      flagged: p.flagged,
      flagReason: isFounder ? p.flagReason : null,
      aiAverage: p.aiAverage,
      change: null,
      createdAt: p.createdAt,
    };
    if (p.status === 'complete' && !p.flagged) {
      if (previous != null && p.aiAverage != null) {
        entry.change = Math.round((p.aiAverage - previous) * 100) / 100;
      }
      previous = p.aiAverage;
    }
    return entry;
  });

  const rankedId = idea.rankedPitch ? String(idea.rankedPitch) : null;
  const ranked = rankedId ? pitches.find((p) => String(p._id) === rankedId) : null;
  // The page leads with the Ranked Pitch; a founder with no ranked pitch yet sees the newest.
  const lead = ranked ?? (isFounder ? pitches[pitches.length - 1] : null);

  return {
    idea: serializeIdeaCard(idea, {
      rankedPitchId: rankedId,
      viewerIsFounder: Boolean(isFounder),
      hasVoted: await hasVoted(ideaId, viewerId),
    }),
    pitch: lead ? serializePitch(lead, sortRoasts(roastsByPitch.get(String(lead._id)))) : null,
    history,
  };
}

export async function updateIdeaMeta({ ideaId, userId, title, tags }) {
  const idea = await Idea.findById(ideaId);
  if (!idea || idea.deletedAt) throw notFound('Idea not found.');
  if (String(idea.founder) !== String(userId)) throw forbidden('Only the founder can edit this idea.');

  if (title !== undefined) idea.title = title;
  if (tags !== undefined) idea.tags = tags;
  await idea.save();
  return idea;
}

/** Soft delete: the idea disappears everywhere but its data stays stored. */
export async function deleteIdea({ ideaId, userId }) {
  const idea = await Idea.findById(ideaId);
  if (!idea || idea.deletedAt) throw notFound('Idea not found.');
  if (String(idea.founder) !== String(userId)) throw forbidden('Only the founder can delete this idea.');

  idea.deletedAt = new Date();
  await idea.save();
  await recomputeAndNotify(ideaId); // refreshes the leaderboard and top-10 notifications
  return idea;
}
