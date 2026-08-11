import { AIRouter } from './ai-router.js';
import { CloudProvider } from './cloud-provider.js';
import { LocalProvider } from './local-provider.js';
import { defaultModel, isLocalProvider } from './models.js';
import { decryptSecret } from '../config/secret.js';
/**
 * Build the AI router for the configured provider/model.
 * Local providers (ollama / lm studio) always route to the real local inference
 * and need no API key; cloud providers use the real SDK when an (encrypted) key
 * is set and fall back to deterministic local stubs otherwise (audits still
 * produce AI output offline).
 */
export function createAIRouter(ai) {
    const modelId = ai.model ?? defaultModel(ai.provider);
    if (isLocalProvider(ai.provider)) {
        const provider = new CloudProvider({ provider: ai.provider, model: modelId, apiKey: 'local' });
        return new AIRouter(provider, provider);
    }
    const apiKey = decryptSecret(ai.api_key ?? '');
    if (apiKey) {
        const provider = new CloudProvider({
            provider: ai.provider,
            model: modelId,
            apiKey
        });
        return new AIRouter(provider, provider);
    }
    return new AIRouter(new LocalProvider(), new LocalProvider());
}
//# sourceMappingURL=factory.js.map