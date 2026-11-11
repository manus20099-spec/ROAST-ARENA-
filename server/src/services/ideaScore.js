import { LEADERBOARD_MAX, TOP_N } from '../lib/constants.js';
import { computeScore, diffTopTen, pickRankedPitch } from '../lib/rules.js';
import { Idea } from '../models/Idea.js';
import { Pitch } from '../models/Pitch.js';
import { Vote } from '../models/Vote.js';
import { leaderboardChanged } from '../realtime.js';
import { notify } from './notifications.js';

const leaderboardFilter = { rankedPitch: { $type: 'objectId' }, deletedAt: null };
const leaderboardSort = { score: -1, rankedAt: 1, _id: 1 };

export async function topTenIds() {
  const rows = await Idea.find(leaderboardFilter)
    .sort(leaderboardSort)
    .limit(TOP_N)
    .select('_id')
    .lean();
  return rows.map((r) => String(r._id));
}

/**
 * THE one place a score is calculated. It runs only when a Pitch completes or when
 * the set of eligible votes changes. Reads from the database, applies the pure rules,
 * and stores the result on the Idea.
 */
export async function recomputeIdeaScore(ideaId) {
  const idea = await Idea.findById(ideaId);
  if (!idea) return null;

  const pitches = await Pitch.find({ idea: ideaId })
    .select('version status flagged aiAverage completedAt')
    .lean();
  const ranked = pickRankedPitch(pitches);

  const now = new Date();
  const [voteCount, eligibleVotes] = await Promise.all([
    Vote.countDocuments({ idea: ideaId }),
    Vote.countDocuments({ idea: ideaId, eligibleAt: { $lte: now } }),
  ]);

  idea.voteCount = voteCount;
  idea.eligibleVoteCount = eligibleVotes;

  if (ranked) {
    idea.rankedPitch = ranked._id;
    idea.rankedAt = ranked.completedAt ?? now;
    idea.aiScore = ranked.aiAverage;
    idea.score = computeScore({ aiAverage: ranked.aiAverage, eligibleVotes });
  } else {
    idea.rankedPitch = null;
    idea.rankedAt = null;
    idea.aiScore = null;
    idea.score = 0;
  }

  await idea.save();
  return idea;
}

/**
 * Recompute an Idea's score, then tell founders whose Ideas entered or left the top 10.
 * Also schedules a (debounced) leaderboard broadcast.
 */
export async function recomputeAndNotify(ideaId) {
  const before = await topTenIds();
  const idea = await recomputeIdeaScore(ideaId);
  const after = await topTenIds();

  const { entered, exited } = diffTopTen(before, after);
  const affected = [...entered.map((id) => ['top10_enter', id]), ...exited.map((id) => ['top10_exit', id])];
  if (affected.length > 0) {
    const ideas = await Idea.find({ _id: { $in: affected.map(([, id]) => id) } })
      .select('founder title')
      .lean();
    const byId = new Map(ideas.map((i) => [String(i._id), i]));
    await Promise.all(
      affected.map(([type, id]) => {
        const target = byId.get(id);
        if (!target) return null;
        return notify({
          user: target.founder,
          type,
          idea: target._id,
          data: { title: target.title },
        });
      })
    );
  }

  if (idea) leaderboardChanged();
  return idea;
}

/** The Leaderboard: top 50, ordered by score then by who ranked first. */
export async function getLeaderboardPage({ page = 1, limit = 12 }) {
  const safeLimit = Math.max(1, Math.min(limit, LEADERBOARD_MAX));
  const skip = (Math.max(1, page) - 1) * safeLimit;
  if (skip >= LEADERBOARD_MAX) return { items: [], total: 0, startRank: skip + 1 };

  const take = Math.min(safeLimit, LEADERBOARD_MAX - skip);
  const [items, total] = await Promise.all([
    Idea.find(leaderboardFilter)
      .sort(leaderboardSort)
      .skip(skip)
      .limit(take)
      .populate('founder', 'displayName avatarPath')
      .lean(),
    Idea.countDocuments(leaderboardFilter).then((n) => Math.min(n, LEADERBOARD_MAX)),
  ]);
  return { items, total, startRank: skip + 1 };
}

/**
 * Votes become eligible with time (the voter's account turns 1 hour old).
 * This sweep recomputes any Idea that gained newly eligible votes since the last run.
 */
let lastSweep = new Date(Date.now() - 2 * 60 * 60 * 1000);

export async function sweepEligibleVotes() {
  const from = lastSweep;
  const to = new Date();
  lastSweep = to;

  const ideaIds = await Vote.distinct('idea', { eligibleAt: { $gt: from, $lte: to } });
  for (const id of ideaIds) {
    await recomputeAndNotify(id);
  }
  return ideaIds.length;
}
