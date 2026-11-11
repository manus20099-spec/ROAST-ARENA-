import { z } from 'zod';
import { LIMITS, ROAST_LEVELS, TAGS } from './lib/constants.js';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(LIMITS.password.min).max(LIMITS.password.max),
  displayName: z
    .string()
    .trim()
    .min(LIMITS.displayName.min)
    .max(LIMITS.displayName.max)
    .regex(/^[A-Za-z0-9_]+$/, 'Display name may only contain letters, numbers, and underscores.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

// ─── Ideas / Pitches ─────────────────────────────────────────────────────────

const pitchFields = {
  problem: z.string().trim().min(LIMITS.problem.min).max(LIMITS.problem.max),
  solution: z.string().trim().min(LIMITS.solution.min).max(LIMITS.solution.max),
  customer: z.string().trim().min(LIMITS.customer.min).max(LIMITS.customer.max),
  roastLevel: z.enum(ROAST_LEVELS),
};

export const postIdeaSchema = z.object({
  title: z.string().trim().min(LIMITS.title.min).max(LIMITS.title.max),
  tags: z
    .array(z.enum(TAGS))
    .max(3, 'An idea can have at most 3 tags.')
    .default([]),
  ...pitchFields,
});

export const updateIdeaSchema = z
  .object({
    title: z.string().trim().min(LIMITS.title.min).max(LIMITS.title.max).optional(),
    tags: z.array(z.enum(TAGS)).max(3).optional(),
  })
  .refine((d) => d.title !== undefined || d.tags !== undefined, {
    message: 'Provide at least one of: title, tags.',
  });

export const addPitchSchema = z.object(pitchFields);

// ─── Comments ────────────────────────────────────────────────────────────────

export const addCommentSchema = z.object({
  body: z.string().trim().min(LIMITS.comment.min).max(LIMITS.comment.max),
});

// ─── Users / Profile ─────────────────────────────────────────────────────────

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(LIMITS.displayName.min)
      .max(LIMITS.displayName.max)
      .regex(/^[A-Za-z0-9_]+$/, 'Display name may only contain letters, numbers, and underscores.')
      .optional(),
    bio: z.string().trim().max(LIMITS.bio.max).optional(),
  })
  .refine((d) => d.displayName !== undefined || d.bio !== undefined, {
    message: 'Provide at least one of: displayName, bio.',
  });

// ─── Pagination / List ───────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  view: z.enum(['leaderboard', 'new', 'mine']).default('leaderboard'),
  tag: z.string().optional(),
  q: z.string().optional(),
});
