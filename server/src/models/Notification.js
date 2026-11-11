import mongoose from 'mongoose';

const { Schema } = mongoose;

export const NOTIFICATION_TYPES = [
  'comment', // someone commented on your idea
  'vote_milestone', // your idea reached 10 / 25 / 50 / 100 votes
  'top10_enter', // your idea entered the top 10
  'top10_exit', // your idea left the top 10
  'comment_hidden', // your comment was hidden (reports or the founder)
  'pitch_flagged', // one of your pitches was flagged
];

/** In-app notification. Only the newest 50 per user are kept. */
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    idea: { type: Schema.Types.ObjectId, ref: 'Idea', default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
