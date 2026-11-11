import { config } from '../../config.js';
import { createClaudeProvider } from './claude.js';
import { createGeminiProvider } from './gemini.js';

/**
 * The adapter: the rest of the app only ever sees `{ name, generate }` or `null`.
 * `null` means "no AI configured", and the pipeline writes Fallback Roasts directly.
 * Swapping provider is a change to AI_PROVIDER in .env, not to code.
 */
export function createProvider(aiConfig = config.ai) {
  switch (aiConfig.provider) {
    case 'gemini':
      return createGeminiProvider({ apiKey: aiConfig.geminiKey, model: aiConfig.geminiModel });
    case 'claude':
      return createClaudeProvider({ apiKey: aiConfig.anthropicKey, model: aiConfig.claudeModel });
    default:
      return null;
  }
}
