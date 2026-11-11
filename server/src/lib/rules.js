import {
  PITCH_RULES,
  SCORE,
  VOTE_ELIGIBLE_AFTER_MS,
  VOTE_MILESTONES,
} from './constants.js';
import { AppError, badRequest, forbidden, notFound } from './errors.js';

/**
 * Pure rule functions: no database, no network. Services call these so the rules
 * can be tested on their own and live in exactly one place.
 */

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Leaderboard score from 0 to 100.
 *   ai    = average Roast score / 10                      (0..1)
 *   votes = v / (v + K)   saturating, so 500 votes do not bury 50   (0..1)
 *   score = 100 * (0.6 * ai + 0.4 * votes)
 */
export function computeScore({ aiAverage, eligibleVotes }, weights = SCORE) {
  const ai = Math.min(10, Math.max(0, Number(aiAverage) || 0)) / 10;
  const v = Math.max(0, Number(eligibleVotes) || 0);
  const votes = v / (v + weights.voteK);
  return round2(100 * (weights.weightAi * ai + weights.weightVotes * votes));
}

/** The Ranked Pitch: the newest Complete Pitch that is not Flagged. */
export function pickRankedPitch(pitches) {
  return (
    [...pitches]
      .filter((p) => p.status === 'complete' && !p.flagged)
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

/** A vote starts counting once the voter's account is old enough. */
export function voteEligibleAt(userCreatedAt, afterMs = VOTE_ELIGIBLE_AFTER_MS) {
  return new Date(new Date(userCreatedAt).getTime() + afterMs);
}

/** Throws unless this user may vote on this idea right now. */
export function assertCanVote({ idea, userId }) {
  if (!idea || idea.deletedAt) throw notFound('Idea not found.');
  if (String(idea.founder) === String(userId)) {
    throw forbidden('You cannot vote on your own idea.');
  }
  if (!idea.rankedPitch) {
    throw badRequest('This idea has no completed pitch yet, so it cannot be voted on.', 'NOT_VOTABLE');
  }
}

/** The vote milestones passed when the count moves from `before` to `after`. */
export function milestonesCrossed(before, after, milestones = VOTE_MILESTONES) {
  return milestones.filter((m) => before < m && after >= m);
}

/** Which ideas entered or left the top N between two ordered id lists. */
export function diffTopTen(beforeIds, afterIds) {
  const before = new Set(beforeIds.map(String));
  const after = new Set(afterIds.map(String));
  return {
    entered: [...after].filter((id) => !before.has(id)),
    exited: [...before].filter((id) => !after.has(id)),
  };
}

/** Throws unless the founder may add another Pitch to the Idea. */
export function assertCanRepitch({ idea, userId, pendingCount, pitchesLastHour }) {
  if (!idea || idea.deletedAt) throw notFound('Idea not found.');
  if (String(idea.founder) !== String(userId)) throw forbidden('Only the founder can re-pitch.');
  if (idea.pitchCount >= PITCH_RULES.maxPitchesPerIdea) {
    throw new AppError(
      409,
      `An idea can have at most ${PITCH_RULES.maxPitchesPerIdea} pitches.`,
      'PITCH_LIMIT'
    );
  }
  assertCanSubmitPitch({ pendingCount, pitchesLastHour });
}

/** Limits that apply to any new Pitch, first or later. */
export function assertCanSubmitPitch({ pendingCount, pitchesLastHour }) {
  if (pendingCount > 0) {
    throw new AppError(
      409,
      'You already have a pitch being roasted. Wait for it to finish.',
      'PITCH_PENDING'
    );
  }
  if (pitchesLastHour >= PITCH_RULES.maxPitchesPerHour) {
    throw new AppError(429, 'You have submitted too many pitches this hour. Try again later.', 'RATE_LIMITED');
  }
}
