import { INVESTORS, ROAST_LIMITS as L } from '../lib/constants.js';
import { hashString, normalizeWords } from '../lib/text.js';

/**
 * Deterministic template Roasts, used when the AI is unavailable or keeps failing.
 * Scores come from simple, explainable rules, so a Fallback Roast is modest on purpose
 * (3 to 7) and always labelled `source: "fallback"` by the pipeline.
 */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function fallbackScore(pitch, investorKey) {
  const all = `${pitch.problem} ${pitch.solution} ${pitch.customer}`;
  const words = normalizeWords(all);
  const unique = new Set(words).size;

  let score = 4;
  if (pitch.problem.length >= 120) score += 1;
  if (pitch.solution.length >= 120) score += 1;
  if (pitch.customer.length >= 60) score += 1;
  if (/\d/.test(all)) score += 1; // mentions a number: size, price, count
  if (unique < 25) score -= 1; // very thin text

  // Each investor leans a little differently so the three scores are not identical.
  const lean = { strict: -1, funny: 0, dreamer: 1 }[investorKey] ?? 0;
  return clamp(score + lean, 3, 7);
}

export function fallbackOffer(score) {
  return {
    amountLakh: clamp(score * 3, L.amountLakhMin, L.amountLakhMax),
    equityPercent: clamp(30 - score * 3, L.equityMin, L.equityMax),
  };
}

const TEMPLATES = {
  strict: {
    mild: [
      'There is a real problem here, but I cannot yet see how this makes money. Show me who pays and how much.',
      'A decent start. The market size is still a guess, so back it up with one real number.',
    ],
    medium: [
      'Nice story, but where is the revenue? Right now this is a hobby with a logo.',
      'I like the problem. I do not like the silence about pricing. Who pays, and why would they keep paying?',
    ],
    spicy: [
      'Lovely idea, shame about the business model. Without a clear way to earn, this is a very expensive hobby.',
      'You have described a problem and a wish. A business needs a customer with a wallet. Where is yours?',
    ],
  },
  funny: [
    'I laughed, I nodded, and then I realised I could not explain it to my aunt. Make it simpler and it gets better.',
    'This idea has big main-character energy and a small plan. Good bones, though.',
    'Bold! Like biryani at a diet party. Now show me the one thing people cannot get anywhere else.',
  ],
  dreamer: [
    'Now imagine this beyond one campus: every university in the country, then the region. That is the real pitch.',
    'The seed is good. Grow it into a platform that other founders build on, and it becomes much bigger.',
    'Picture this as a daily habit for millions, not a one-time tool. That is where the big version lives.',
  ],
};

const TIPS = {
  strict: [
    'Add one real number: how many customers, and what each would pay per month.',
    'Name your first ten customers and how you would reach them.',
  ],
  funny: [
    'Explain the idea in one sentence a stranger could repeat.',
    'Lead with the funniest true thing about the problem, then your fix.',
  ],
  dreamer: [
    'Sketch a version of this that could work in three countries.',
    'Add one feature that makes users bring their friends.',
  ],
};

function pick(list, seed) {
  const safeSeed = Math.abs(seed);
  return list[safeSeed % list.length];
}

function trimTo(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function buildFallbackRoast(pitch, investorKey, seedKey = '') {
  const seed = hashString(`${pitch.problem}|${pitch.solution}|${investorKey}|${seedKey}`);
  const score = fallbackScore(pitch, investorKey);

  const roastPool =
    investorKey === 'strict'
      ? TEMPLATES.strict[pitch.roastLevel] ?? TEMPLATES.strict.medium
      : TEMPLATES[investorKey];

  const roast = trimTo(pick(roastPool, seed), L.roastMax);
  const tip = trimTo(pick(TIPS[investorKey], seed >> 3), L.tipMax);

  return { score, roast, tip, offer: fallbackOffer(score) };
}

export const FALLBACK_INVESTORS = Object.keys(INVESTORS);
