/** Lowercase and reduce to plain words, so comparisons ignore punctuation and spacing. */
export function normalizeWords(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Does `candidate` copy a long run of words straight out of `source`?
 * Used to reject Roasts that just parrot the founder's text back (a common
 * sign of a model that was steered by the pitch rather than judging it).
 */
export function copiesRunFrom(candidate, source, runLength = 8) {
  const cand = normalizeWords(candidate);
  const src = normalizeWords(source);
  if (cand.length < runLength || src.length < runLength) return false;

  const srcRuns = new Set();
  for (let i = 0; i + runLength <= src.length; i += 1) {
    srcRuns.add(src.slice(i, i + runLength).join(' '));
  }
  for (let i = 0; i + runLength <= cand.length; i += 1) {
    if (srcRuns.has(cand.slice(i, i + runLength).join(' '))) return true;
  }
  return false;
}

/** Escape regex special characters. */
export function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Small deterministic hash so the same pitch always gets the same fallback wording. */
export function hashString(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
