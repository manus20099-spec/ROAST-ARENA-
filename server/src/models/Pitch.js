import mongoose from 'mongoose';
import { LIMITS, PITCH_RULES, ROAST_LEVELS } from '../lib/constants.js';

const { Schema } = mongoose;

/**
 * One versioned submission of an Idea. Text is immutable after creation:
 * every change is a re-pitch (a new Pitch with version + 1).
 */
const pitchSchema = new Schema(
  {
    idea: { type: Schema.Types.ObjectId, ref: 'Idea', required: true },
    founder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, required: true, min: 1, max: PITCH_RULES.maxPitchesPerIdea },

    problem: {
      type: String,
      required: true,
      trim: true,
      minlength: LIMITS.problem.min,
      maxlength: LIMITS.problem.max,
    },
    solution: {
      type: String,
      required: true,
      trim: true,
      minlength: LIMITS.solution.min,
      maxlength: LIMITS.solution.max,
    },
    customer: {
      type: String,
      required: true,
      trim: true,
      minlength: LIMITS.customer.min,
      maxlength: LIMITS.customer.max,
    },
    roastLevel: { type: String, enum: ROAST_LEVELS, required: true },

    // pending = still waiting for all three Roasts; complete = all three present.
    status: { type: String, enum: ['pending', 'complete'], default: 'pending' },
    completedAt: { type: Date, default: null },

    // A Flagged Pitch is complete but kept out of the Leaderboard.
    flagged: { type: Boolean, default: false },
    flagReason: { type: String, default: null },

    // Average of the three Roast scores (set when complete).
    aiAverage: { type: Number, default: null, min: 1, max: 10 },
  },
  { timestamps: true }
);

pitchSchema.index({ idea: 1, version: 1 }, { unique: true });
pitchSchema.index({ founder: 1, createdAt: -1 }); // hourly rate limit
pitchSchema.index({ status: 1, createdAt: 1 }); // recovering stuck pending pitches

// Text can never change once written.
pitchSchema.pre('save', function lockText(next) {
  if (!this.isNew) {
    for (const field of ['problem', 'solution', 'customer', 'roastLevel', 'version', 'idea']) {
      if (this.isModified(field)) {
        return next(new Error(`Pitch.${field} is immutable. Submit a re-pitch instead.`));
      }
    }
  }
  return next();
});

export const Pitch = mongoose.models.Pitch || mongoose.model('Pitch', pitchSchema);
