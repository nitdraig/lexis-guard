/**
 * OpenAI-compatible inference endpoints of the local servers.
 * Both Ollama (>= 0.5) and LM Studio expose /v1, so the same createOpenAI
 * factory talks to them and GET /v1/models lists installed models.
 */
export const OLLAMA_INFERENCE_URL = 'http://localhost:11434/v1';
export const LMSTUDIO_INFERENCE_URL = 'http://localhost:1234/v1';
/**
 * List the models the user has installed locally via each server's
 * OpenAI-compatible GET /v1/models. Returns [] when the server is
 * unreachable so the caller can fall back to a manual model id.
 */
export async function listLocalModels(provider) {
    const base = provider === 'ollama' ? OLLAMA_INFERENCE_URL : LMSTUDIO_INFERENCE_URL;
    try {
        const res = await fetch(`${base}/models`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok)
            return [];
        const data = (await res.json());
        return (data.data ?? []).map((m) => m.id ?? '').filter((id) => id.length > 0);
    }
    catch {
        // lexis: server down -> empty list; the TUI then offers manual model input
        return [];
    }
}
//# sourceMappingURL=local-models.js.map