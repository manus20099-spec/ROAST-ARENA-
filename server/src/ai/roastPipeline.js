import { config } from '../config.js';
import { INVESTOR_KEYS } from '../lib/constants.js';
import { buildFallbackRoast } from './fallback.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { createProvider } from './providers/index.js';
import { InvalidAiReply, parseRoastReply } from './schema.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Run `provider.generate` but give up after `timeoutMs`. */
async function generateWithTimeout(provider, args, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await provider.generate({ ...args, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get one validated Roast for one Investor.
 *
 *  - Ask the provider up to `maxAttempts` times.
 *  - Any reply that fails validation is rejected, never repaired (docs/adr/0001).
 *  - If every attempt fails, return a Fallback Roast labelled `source: "fallback"`.
 *
 * Never throws: a Pitch must always be able to finish.
 */
export async function generateRoast({
  investorKey,
  pitch,
  provider = createProvider(),
  aiConfig = config.ai,
  logger = console,
}) {
  const maxAttempts = Math.max(1, aiConfig.maxAttempts);
  let attempts = 0;
  let lastError = provider ? null : new Error('No AI provider configured');

  if (provider) {
    const system = buildSystemPrompt(investorKey, pitch.roastLevel);
    const user = buildUserPrompt(pitch);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attempts = attempt;
      try {
        const raw = await generateWithTimeout(provider, { system, user }, aiConfig.timeoutMs);
        const roast = parseRoastReply(raw, pitch);
        return { ...roast, source: 'ai', provider: provider.name, attempts };
      } catch (err) {
        lastError = err;
        const kind = err instanceof InvalidAiReply ? 'rejected' : 'failed';
        logger.warn?.(
          `[ai] ${investorKey} attempt ${attempt}/${maxAttempts} ${kind}: ${err.message}`
        );
        if (attempt < maxAttempts && aiConfig.retryDelayMs > 0) {
          await sleep(aiConfig.retryDelayMs * attempt);
        }
      }
    }
  }

  logger.warn?.(`[ai] ${investorKey}: using fallback (${lastError?.message ?? 'unknown'})`);
  return {
    ...buildFallbackRoast(pitch, investorKey, String(pitch._id ?? '')),
    source: 'fallback',
    provider: provider ? provider.name : null,
    attempts,
  };
}

/**
 * Generate all three Roasts in parallel. Each Investor has its own attempts and timeout,
 * so one failing never blocks the other two. `onRoast` fires as each one finishes.
 */
export async function generateAllRoasts({
  pitch,
  onRoast,
  investors = INVESTOR_KEYS,
  ...options
}) {
  return Promise.all(
    investors.map(async (investorKey) => {
      const roast = await generateRoast({ investorKey, pitch, ...options });
      const result = { investor: investorKey, ...roast };
      if (onRoast) await onRoast(result);
      return result;
    })
  );
}
