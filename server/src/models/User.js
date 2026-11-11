import mongoose from 'mongoose';
import { LIMITS } from '../lib/constants.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    // Login identity. Never exposed publicly.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },

    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: LIMITS.displayName.min,
      maxlength: LIMITS.displayName.max,
      match: /^[A-Za-z0-9_]+$/,
    },
    // Lowercased copy so "Ali" and "ali" cannot both exist.
    displayNameKey: { type: String, required: true, unique: true },
    displayNameChangedAt: { type: Date, default: null },

    bio: { type: String, default: '', maxlength: LIMITS.bio.max },
    avatarPath: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('validate', function setDisplayNameKey(next) {
  if (this.displayName) this.displayNameKey = this.displayName.toLowerCase();
  next();
});

/** Shape that is safe to send to any client. Email is excluded on purpose. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    displayName: this.displayName,
    bio: this.bio,
    avatarPath: this.avatarPath,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
