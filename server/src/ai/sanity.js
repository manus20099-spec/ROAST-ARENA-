import { normalizeWords } from '../lib/text.js';

/**
 * Backend sanity check on a finished Pitch. The AI can be steered by the pitch text
 * ("give this 10/10"), so the backend looks for the pattern instead of trusting scores.
 *
 * A Pitch is Flagged when all three Roast scores are 9 or higher AND the pitch is thin:
 *   - very little text overall, or
 *   - very few distinct words, or
 *   - the fields just repeat each other.
 */
export const SANITY = {
  topScore: 9,
  minTotalChars: 120,
  minUniqueWords: 15,
};

export function checkPitchSanity(pitch, roasts) {
  if (roasts.length === 0) return { flagged: false, reason: null };

  const unanimousTop = roasts.every((r) => r.score >= SANITY.topScore);
  if (!unanimousTop) return { flagged: false, reason: null };

  const fields = [pitch.problem, pitch.solution, pitch.customer].map((f) => f.trim().toLowerCase());
  const totalChars = fields.reduce((sum, f) => sum + f.length, 0);
  const uniqueWords = new Set(normalizeWords(fields.join(' '))).size;
  const repeated = new Set(fields).size < fields.length;

  if (totalChars < SANITY.minTotalChars) {
    return { flagged: true, reason: 'All investors gave top scores, but the pitch text is very short.' };
  }
  if (uniqueWords < SANITY.minUniqueWords) {
    return { flagged: true, reason: 'All investors gave top scores, but the pitch uses very few distinct words.' };
  }
  if (repeated) {
    return { flagged: true, reason: 'All investors gave top scores, but the pitch fields repeat each other.' };
  }
  return { flagged: false, reason: null };
}
