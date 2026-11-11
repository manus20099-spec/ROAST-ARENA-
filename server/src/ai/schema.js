import { z } from 'zod';
import { ROAST_LIMITS as L } from '../lib/constants.js';
import { copiesRunFrom } from '../lib/text.js';

/**
 * The only shape the backend accepts from an Investor.
 * A reply that does not match is rejected, never repaired (see docs/adr/0001).
 */
export const roastSchema = z
  .object({
    score: z.number().int().min(L.scoreMin).max(L.scoreMax),
    roast: z.string().trim().min(L.roastMin).max(L.roastMax),
    tip: z.string().trim().min(L.tipMin).max(L.tipMax),
    offer: z
      .object({
        amountLakh: z.number().int().min(L.amountLakhMin).max(L.amountLakhMax),
        equityPercent: z.number().int().min(L.equityMin).max(L.equityMax),
      })
      .strict(),
  })
  .strict();

export class InvalidAiReply extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidAiReply';
  }
}

/** Pull one JSON object out of a model reply (models sometimes add code fences or a sentence). */
export function extractJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new InvalidAiReply('Empty reply');
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) throw new InvalidAiReply('No JSON object in reply');
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new InvalidAiReply('Reply is not valid JSON');
  }
}

/**
 * Parse and validate a raw model reply for one pitch.
 * Throws InvalidAiReply on any problem; returns the clean Roast fields otherwise.
 */
export function parseRoastReply(rawText, pitch) {
  const json = extractJson(rawText);
  const result = roastSchema.safeParse(json);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new InvalidAiReply(`Schema check failed at ${first.path.join('.') || 'root'}: ${first.message}`);
  }
  const roast = result.data;

  // Reject replies that parrot the founder's own words back.
  const pitchText = `${pitch.problem} ${pitch.solution} ${pitch.customer}`;
  if (copiesRunFrom(`${roast.roast} ${roast.tip}`, pitchText)) {
    throw new InvalidAiReply('Reply copies a long passage from the pitch');
  }
  return roast;
}
