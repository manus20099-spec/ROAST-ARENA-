import mongoose from 'mongoose';
import { LIMITS, MAX_TAGS_PER_IDEA, TAGS } from '../lib/constants.js';

const { Schema } = mongoose;

/**
 * An Idea persists across re-pitches and owns the votes.
 * Everything below the "denormalised" line is derived data kept in sync
 * by services/scoring.js (recomputeIdeaScore) and services/pitches.js.
 */
const ideaSchema = new Schema(
  {
    founder: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: LIMITS.title.min,
      maxlength: LIMITS.title.max,
    },
    tags: {
      type: [{ type: String, enum: TAGS }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= MAX_TAGS_PER_IDEA && new Set(arr).size === arr.length,
        message: `An idea can have at most ${MAX_TAGS_PER_IDEA} distinct tags.`,
      },
    },
    coverImagePath: { type: String, default: null },

    // Number of Pitches ever created for this Idea (also the latest version number).
    pitchCount: { type: Number, default: 0, min: 0 },

    deletedAt: { type: Date, default: null },

    // ---- denormalised (derived) ----
    // The Ranked Pitch: newest Complete Pitch that is not Flagged. Null = not on the Leaderboard.
    rankedPitch: { type: Schema.Types.ObjectId, ref: 'Pitch', default: null },
    rankedAt: { type: Date, default: null }, // when the Ranked Pitch completed (tie-break)
    aiScore: { type: Number, default: null, min: 0, max: 10 }, // average of the 3 Roast scores
    score: { type: Number, default: 0, min: 0, max: 100 }, // Leaderboard score
    voteCount: { type: Number, default: 0, min: 0 }, // every vote
    eligibleVoteCount: { type: Number, default: 0, min: 0 }, // votes that count toward score
    commentCount: { type: Number, default: 0, min: 0 },
    // Newest Pitch's problem text, for search and cards.
    previewProblem: { type: String, default: '' },
  },
  { timestamps: true }
);

// Leaderboard: only ranked, non-deleted ideas, ordered by score then who ranked first.
ideaSchema.index(
  { score: -1, rankedAt: 1, _id: 1 },
  { partialFilterExpression: { rankedPitch: { $type: 'objectId' }, deletedAt: null } }
);
ideaSchema.index({ createdAt: -1 });
ideaSchema.index({ tags: 1 });
ideaSchema.index({ title: 'text', previewProblem: 'text' });

export const Idea = mongoose.models.Idea || mongoose.model('Idea', ideaSchema);
