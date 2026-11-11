import mongoose from 'mongoose';
import { LIMITS } from '../lib/constants.js';

const { Schema } = mongoose;

/** A flat comment on an Idea (not on a Pitch). Hiding and deleting are both soft. */
const commentSchema = new Schema(
  {
    idea: { type: Schema.Types.ObjectId, ref: 'Idea', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: LIMITS.comment.min,
      maxlength: LIMITS.comment.max,
    },
    reportCount: { type: Number, default: 0, min: 0 },
    // Why a comment is hidden: enough reports, or the idea's founder hid it.
    hiddenBy: { type: String, enum: [null, 'reports', 'founder'], default: null },
    deletedAt: { type: Date, default: null }, // author deleted it
  },
  { timestamps: true }
);

commentSchema.index({ idea: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });

export const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
