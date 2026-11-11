import { describe, expect, it } from 'vitest';
import {
  assertCanRepitch,
  assertCanSubmitPitch,
  assertCanVote,
  computeScore,
  diffTopTen,
  milestonesCrossed,
  pickRankedPitch,
  voteEligibleAt,
} from '../../src/lib/rules.js';

describe('Pure domain rules (rules.js)', () => {
  describe('computeScore', () => {
    it('calculates score with 0 votes and top AI average', () => {
      // 100 * (0.6 * 10/10 + 0.4 * 0) = 60
      expect(computeScore({ aiAverage: 10, eligibleVotes: 0 })).toBe(60);
    });

    it('calculates score with 0 AI score and 0 votes', () => {
      expect(computeScore({ aiAverage: 0, eligibleVotes: 0 })).toBe(0);
    });

    it('calculates score when aiAverage=5 and eligibleVotes=5 (voteK=5)', () => {
      // votes = 5 / (5 + 5) = 0.5
      // ai = 5 / 10 = 0.5
      // 100 * (0.6 * 0.5 + 0.4 * 0.5) = 100 * (0.3 + 0.2) = 50
      expect(computeScore({ aiAverage: 5, eligibleVotes: 5 })).toBe(50);
    });

    it('calculates score when aiAverage=7 and eligibleVotes=100', () => {
      // votes = 100 / (100 + 5) = 0.95238
      // ai = 0.7
      // 100 * (0.6 * 0.7 + 0.4 * 0.95238) = 100 * (0.42 + 0.38095) = 80.1
      const score = computeScore({ aiAverage: 7, eligibleVotes: 100 });
      expect(score).toBeCloseTo(80.1, 1);
    });

    it('caps between 0 and 100 even with out-of-range arguments', () => {
      expect(computeScore({ aiAverage: 15, eligibleVotes: 10000 })).toBeLessThanOrEqual(100);
      expect(computeScore({ aiAverage: -5, eligibleVotes: -10 })).toBe(0);
    });
  });

  describe('pickRankedPitch', () => {
    it('returns null when array is empty', () => {
      expect(pickRankedPitch([])).toBeNull();
    });

    it('returns null when all pitches are pending', () => {
      const pitches = [
        { version: 1, status: 'pending', flagged: false },
        { version: 2, status: 'pending', flagged: false },
      ];
      expect(pickRankedPitch(pitches)).toBeNull();
    });

    it('returns null when only pitch is flagged', () => {
      const pitches = [{ version: 1, status: 'complete', flagged: true }];
      expect(pickRankedPitch(pitches)).toBeNull();
    });

    it('returns the latest complete non-flagged pitch by version', () => {
      const pitches = [
        { version: 1, status: 'complete', flagged: false },
        { version: 2, status: 'complete', flagged: false },
      ];
      const ranked = pickRankedPitch(pitches);
      expect(ranked).not.toBeNull();
      expect(ranked.version).toBe(2);
    });

    it('if v1 is complete+flagged and v2 is complete+not-flagged, returns v2', () => {
      const pitches = [
        { version: 1, status: 'complete', flagged: true },
        { version: 2, status: 'complete', flagged: false },
      ];
      expect(pickRankedPitch(pitches)?.version).toBe(2);
    });

    it('if v1 is complete and v2 is pending, returns v1', () => {
      const pitches = [
        { version: 1, status: 'complete', flagged: false },
        { version: 2, status: 'pending', flagged: false },
      ];
      expect(pickRankedPitch(pitches)?.version).toBe(1);
    });
  });

  describe('voteEligibleAt', () => {
    it('returns userCreatedAt + afterMs as Date', () => {
      const created = new Date('2026-11-11T12:00:00Z');
      const eligible = voteEligibleAt(created, 60 * 60 * 1000);
      expect(eligible.toISOString()).toBe('2026-11-11T13:00:00.000Z');
    });
  });

  describe('assertCanVote', () => {
    it('throws NOT_FOUND when idea is null', () => {
      expect(() => assertCanVote({ idea: null, userId: 'u1' })).toThrow(/not found/i);
    });

    it('throws NOT_FOUND when idea is soft-deleted', () => {
      expect(() => assertCanVote({ idea: { deletedAt: new Date() }, userId: 'u1' })).toThrow(/not found/i);
    });

    it('throws FORBIDDEN when founder votes on own idea', () => {
      expect(() => assertCanVote({ idea: { founder: 'u1' }, userId: 'u1' })).toThrow(/cannot vote on your own/i);
    });

    it('throws NOT_VOTABLE when idea has no rankedPitch', () => {
      expect(() =>
        assertCanVote({
          idea: { founder: 'founder1', rankedPitch: null },
          userId: 'u2',
        })
      ).toThrow(/no completed pitch yet/i);
    });

    it('does not throw when all checks pass', () => {
      expect(() =>
        assertCanVote({
          idea: { founder: 'founder1', rankedPitch: 'p1', deletedAt: null },
          userId: 'u2',
        })
      ).not.toThrow();
    });
  });

  describe('milestonesCrossed', () => {
    it('detects single milestone crossing', () => {
      expect(milestonesCrossed(9, 10)).toEqual([10]);
    });

    it('does not re-trigger previously crossed milestone', () => {
      expect(milestonesCrossed(10, 25)).toEqual([25]);
    });

    it('detects multiple milestone crossings at once', () => {
      expect(milestonesCrossed(9, 26)).toEqual([10, 25]);
    });

    it('returns empty when no milestone was crossed', () => {
      expect(milestonesCrossed(50, 51)).toEqual([]);
    });

    it('detects milestone 100', () => {
      expect(milestonesCrossed(99, 101)).toEqual([100]);
    });
  });

  describe('diffTopTen', () => {
    it('correctly reports entered and exited ids', () => {
      const before = ['a', 'b'];
      const after = ['b', 'c'];
      const diff = diffTopTen(before, after);
      expect(diff.entered).toEqual(['c']);
      expect(diff.exited).toEqual(['a']);
    });
  });

  describe('assertCanRepitch & assertCanSubmitPitch', () => {
    it('throws NOT_FOUND if idea is missing', () => {
      expect(() => assertCanRepitch({ idea: null, userId: 'u1' })).toThrow(/not found/i);
    });

    it('throws FORBIDDEN if user is not founder', () => {
      expect(() =>
        assertCanRepitch({
          idea: { founder: 'u1', deletedAt: null },
          userId: 'u2',
        })
      ).toThrow(/only the founder/i);
    });

    it('throws 409 PITCH_LIMIT when max pitches reached', () => {
      expect(() =>
        assertCanRepitch({
          idea: { founder: 'u1', pitchCount: 5, deletedAt: null },
          userId: 'u1',
          pendingCount: 0,
          pitchesLastHour: 0,
        })
      ).toThrow(/at most 5 pitches/i);
    });

    it('throws 409 PITCH_PENDING when user has an in-flight pitch', () => {
      expect(() =>
        assertCanSubmitPitch({
          pendingCount: 1,
          pitchesLastHour: 0,
        })
      ).toThrow(/already have a pitch being roasted/i);
    });

    it('throws 429 when hourly pitch limit exceeded', () => {
      expect(() =>
        assertCanSubmitPitch({
          pendingCount: 0,
          pitchesLastHour: 10,
        })
      ).toThrow(/too many pitches this hour/i);
    });
  });
});
