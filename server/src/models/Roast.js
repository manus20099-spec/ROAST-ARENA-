import mongoose from 'mongoose';
import { INVESTOR_KEYS, ROAST_LIMITS as L } from '../lib/constants.js';

const { Schema } = mongoose;

/**
 * One Investor's response to a Pitch. The numeric limits here repeat the Zod schema
 * on purpose: even if a bug skipped validation, the database still refuses bad values.
 */
const roastSchema = new Schema(
  {
    pitch: { type: Schema.Types.ObjectId, ref: 'Pitch', required: true },
    idea: { type: Schema.Types.ObjectId, ref: 'Idea', required: true },
    investor: { type: String, enum: INVESTOR_KEYS, required: true },

    score: { type: Number, required: true, min: L.scoreMin, max: L.scoreMax, validate: Number.isInteger },
    roast: { type: String, required: true, minlength: L.roastMin, maxlength: L.roastMax },
    tip: { type: String, required: true, minlength: L.tipMin, maxlength: L.tipMax },
    offer: {
      amountLakh: {
        type: Number,
        required: true,
        min: L.amountLakhMin,
        max: L.amountLakhMax,
        validate: Number.isInteger,
      },
      equityPercent: {
        type: Number,
        required: true,
        min: L.equityMin,
        max: L.equityMax,
        validate: Number.isInteger,
      },
    },

    // ai = written by the model; fallback = template rules; seed = demo data.
    source: { type: String, enum: ['ai', 'fallback', 'seed'], required: true },
    provider: { type: String, default: null },
    attempts: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true }
);

roastSchema.index({ pitch: 1, investor: 1 }, { unique: true });
roastSchema.index({ idea: 1 });

export const Roast = mongoose.models.Roast || mongoose.model('Roast', roastSchema);
