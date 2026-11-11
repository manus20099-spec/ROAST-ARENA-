import { escapeRegExp } from './text.js';

/**
 * A short, editable blocklist. It is a first line of defence, not a complete filter:
 * the AI system prompt also forbids attacks on people, and comments can be reported.
 * Add terms here as needed.
 */
export const BLOCKED_TERMS = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'cunt',
  'slut',
  'whore',
  'madarchod',
  'bhenchod',
  'chutiya',
  'harami',
  'gandu',
];

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

function normalizeForMatch(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[0134577@$]/g, (ch) => LEET[ch] ?? ch)
    .replace(/[^a-z\s]/g, '');
}

const patterns = BLOCKED_TERMS.map((term) => new RegExp(`\\b${escapeRegExp(term)}\\w*\\b`, 'i'));

/** Returns the first blocked term found, or null. */
export function findBlockedTerm(...texts) {
  for (const text of texts) {
    const clean = normalizeForMatch(text);
    for (let i = 0; i < patterns.length; i += 1) {
      if (patterns[i].test(clean)) return BLOCKED_TERMS[i];
    }
  }
  return null;
}
