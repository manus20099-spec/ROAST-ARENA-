import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { DISPLAY_NAME_COOLDOWN_MS, DISPOSABLE_EMAIL_DOMAINS } from '../lib/constants.js';
import { badRequest, conflict, notFound, unauthorized } from '../lib/errors.js';
import { Idea } from '../models/Idea.js';
import { User } from '../models/User.js';
import { Vote } from '../models/Vote.js';

const BCRYPT_COST = 10;
// A real hash used to burn the same time when the email is unknown, so login timing
// does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: config.cookieMaxAgeMs,
    path: '/',
  };
}

export async function signup({ email, password, displayName }) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    throw badRequest('Please use a permanent email address.', 'DISPOSABLE_EMAIL');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    return await User.create({ email, passwordHash, displayName });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      if (field === 'displayNameKey') throw conflict('That display name is taken.', 'NAME_TAKEN');
      throw conflict('An account with that email already exists.', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  // One message for both cases, so nobody can probe which emails exist.
  if (!user || !ok) throw unauthorized('Email or password is incorrect.');
  return user;
}

export async function getProfile(displayName) {
  const user = await User.findOne({ displayNameKey: displayName.toLowerCase() });
  if (!user) throw notFound('User not found.');

  const ideas = await Idea.find({ founder: user._id, deletedAt: null, rankedPitch: { $type: 'objectId' } })
    .sort({ score: -1, rankedAt: 1 })
    .lean();

  const totalVotes = ideas.reduce((sum, i) => sum + i.voteCount, 0);
  const best = ideas[0] ?? null;

  let bestRank = null;
  if (best) {
    const ahead = await Idea.countDocuments({
      deletedAt: null,
      rankedPitch: { $type: 'objectId' },
      $or: [
        { score: { $gt: best.score } },
        { score: best.score, rankedAt: { $lt: best.rankedAt } },
      ],
    });
    bestRank = ahead + 1;
  }

  return {
    user: user.toPublic(),
    stats: { ideaCount: ideas.length, totalVotes, bestRank },
    ideas: ideas.map((i) => ({
      id: String(i._id),
      title: i.title,
      tags: i.tags,
      score: i.score,
      voteCount: i.voteCount,
      coverImagePath: i.coverImagePath,
    })),
  };
}

export async function updateProfile(userId, { displayName, bio }) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found.');

  if (bio !== undefined) user.bio = bio;

  if (displayName !== undefined && displayName !== user.displayName) {
    // Case-only changes (Ali -> ali) are free; real renames are limited to once per 30 days.
    const sameKey = displayName.toLowerCase() === user.displayNameKey;
    if (!sameKey && user.displayNameChangedAt) {
      const next = user.displayNameChangedAt.getTime() + DISPLAY_NAME_COOLDOWN_MS;
      if (Date.now() < next) {
        throw conflict(
          `You can change your display name again on ${new Date(next).toDateString()}.`,
          'NAME_COOLDOWN'
        );
      }
    }
    user.displayName = displayName;
    if (!sameKey) user.displayNameChangedAt = new Date();
  }

  try {
    await user.save();
  } catch (err) {
    if (err?.code === 11000) throw conflict('That display name is taken.', 'NAME_TAKEN');
    throw err;
  }
  return user;
}

export async function setAvatarPath(userId, avatarPath) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found.');
  const previous = user.avatarPath;
  user.avatarPath = avatarPath;
  await user.save();
  return { user, previous };
}

/** Votes a user has cast (used by the client to show which ideas are already voted). */
export async function votedIdeaIds(userId) {
  const votes = await Vote.find({ user: userId }).select('idea').lean();
  return votes.map((v) => String(v.idea));
}
