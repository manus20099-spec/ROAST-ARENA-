import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = process.env;
const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

if (isProduction && (!env.JWT_SECRET || env.JWT_SECRET.startsWith('change-me'))) {
  throw new Error('JWT_SECRET must be set to a long random string in production.');
}

/**
 * Decide which AI provider to use.
 * An explicit AI_PROVIDER wins; if its key is missing we fall back (and say so),
 * so a fresh clone with no keys still runs end to end.
 */
function resolveProvider() {
  const wanted = (env.AI_PROVIDER || '').toLowerCase();
  const hasGemini = Boolean(env.GEMINI_API_KEY);
  const hasClaude = Boolean(env.ANTHROPIC_API_KEY);

  if (wanted === 'fallback') return 'fallback';
  if (wanted === 'gemini') return hasGemini ? 'gemini' : 'fallback';
  if (wanted === 'claude') return hasClaude ? 'claude' : 'fallback';
  // Not set: default to Gemini, then Claude, then fallback.
  if (hasGemini) return 'gemini';
  if (hasClaude) return 'claude';
  return 'fallback';
}

export const config = {
  env: env.NODE_ENV || 'development',
  isProduction,
  isTest,
  port: int(env.PORT, 5000),
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roast-arena',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
  jwtExpiresIn: '7d',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  uploadsDir: env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads'),
  rateLimitEnabled: env.RATE_LIMIT_ENABLED !== 'false' && !isTest,
  ai: {
    requestedProvider: (env.AI_PROVIDER || '').toLowerCase() || null,
    provider: resolveProvider(),
    geminiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    claudeModel: env.CLAUDE_MODEL || 'claude-haiku-5-5',
    timeoutMs: int(env.AI_TIMEOUT_MS, 15000),
    maxAttempts: int(env.AI_MAX_ATTEMPTS, 3),
    retryDelayMs: isTest ? 0 : 400,
  },
};
