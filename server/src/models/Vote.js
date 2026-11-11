import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A single upvote on an Idea. One per user per idea, enforced by a unique index,
 * so even two simultaneous requests cannot create two votes.
 */
const voteSchema = new Schema(
  {
    idea: { type: Schema.Types.ObjectId, ref: 'Idea', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The moment this vote starts counting toward the score (voter's account age >= 1 hour).
    eligibleAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

voteSchema.index({ idea: 1, user: 1 }, { unique: true });
voteSchema.index({ user: 1 });
voteSchema.index({ eligibleAt: 1 }); // sweeping votes that just became eligible

export const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
