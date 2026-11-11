import mongoose from 'mongoose';

const { Schema } = mongoose;

/** A user's report of a comment. One report per user per comment. */
const reportSchema = new Schema(
  {
    comment: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reportSchema.index({ comment: 1, reporter: 1 }, { unique: true });

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
