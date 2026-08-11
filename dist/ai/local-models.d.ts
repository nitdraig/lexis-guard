import type { LocalProviderName } from './models.js';
/**
 * OpenAI-compatible inference endpoints of the local servers.
 * Both Ollama (>= 0.5) and LM Studio expose /v1, so the same createOpenAI
 * factory talks to them and GET /v1/models lists installed models.
 */
export declare const OLLAMA_INFERENCE_URL = "http://localhost:11434/v1";
export declare const LMSTUDIO_INFERENCE_URL = "http://localhost:1234/v1";
/**
 * List the models the user has installed locally via each server's
 * OpenAI-compatible GET /v1/models. Returns [] when the server is
 * unreachable so the caller can fall back to a manual model id.
 */
export declare function listLocalModels(provider: LocalProviderName): Promise<string[]>;
//# sourceMappingURL=local-models.d.ts.map