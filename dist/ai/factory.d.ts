import { AIRouter } from './ai-router.js';
import { type AiProvider } from './models.js';
export interface AiConfigSource {
    provider: AiProvider;
    model?: string;
    api_key?: string;
}
/**
 * Build the AI router for the configured provider/model.
 * Local providers (ollama / lm studio) always route to the real local inference
 * and need no API key; cloud providers use the real SDK when an (encrypted) key
 * is set and fall back to deterministic local stubs otherwise (audits still
 * produce AI output offline).
 */
export declare function createAIRouter(ai: AiConfigSource): AIRouter;
//# sourceMappingURL=factory.d.ts.map