import { milestonesCrossed, assertCanVote, voteEligibleAt } from '../lib/rules.js';
import { Idea } from '../models/Idea.js';
import { User } from '../models/User.js';
import { Vote } from '../models/Vote.js';
import { emitToIdea } from '../realtime.js';
import { recomputeAndNotify } from './ideaScore.js';
import { notify } from './notifications.js';

/**
 * Toggle the user's upvote on an Idea.
 * Rules (enforced here and by the unique index on {idea, user}):
 *   - one vote per user per idea
 *   - never on your own idea
 *   - only on an idea that has a Ranked Pitch
 */
export async function toggleVote({ ideaId, userId }) {
  const idea = await Idea.findById(ideaId).lean();
  assertCanVote({ idea, userId });

  const before = idea.voteCount;

  // Try to remove an existing vote first; if there was none, add one.
  const removed = await Vote.findOneAndDelete({ idea: ideaId, user: userId });
  let voted;
  if (removed) {
    voted = false;
  } else {
    const user = await User.findById(userId).select('createdAt').lean();
    try {
      await Vote.create({ idea: ideaId, user: userId, eligibleAt: voteEligibleAt(user.createdAt) });
    } catch (err) {
      if (err?.code !== 11000) throw err; // a parallel request already added it
    }
    voted = true;
  }

  const updated = await recomputeAndNotify(ideaId);
  const after = updated?.voteCount ?? before;

  if (voted) {
    for (const milestone of milestonesCrossed(before, after)) {
      await notify({
        user: idea.founder,
        type: 'vote_milestone',
        idea: idea._id,
        data: { title: idea.title, milestone },
      });
    }
  }

  emitToIdea(String(ideaId), 'idea:updated', { ideaId: String(ideaId), voteCount: after });
  return { voted, voteCount: after, score: updated?.score ?? 0 };
}

export async function hasVoted(ideaId, userId) {
  if (!userId) return false;
  return Boolean(await Vote.exists({ idea: ideaId, user: userId }));
}
