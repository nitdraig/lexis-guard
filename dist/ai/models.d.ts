export declare const AI_PROVIDERS: readonly ["openai", "deepseek", "anthropic", "ollama", "lmstudio"];
export type AiProvider = (typeof AI_PROVIDERS)[number];
/** Providers that run inference on the user's machine (no API key). */
export declare const LOCAL_PROVIDERS: readonly ["ollama", "lmstudio"];
export type LocalProviderName = (typeof LOCAL_PROVIDERS)[number];
export declare function isLocalProvider(provider: AiProvider): provider is LocalProviderName;
export type AiTier = 'economical' | 'balanced' | 'top';
export interface AiModelOption {
    id: string;
    provider: AiProvider;
    tier: AiTier;
}
export declare const AI_MODEL_CATALOG: AiModelOption[];
export declare function modelsForProvider(provider: AiProvider): AiModelOption[];
/** Default model for a provider: the first economical tier. Empty for local providers (they vary per machine). */
export declare function defaultModel(provider: AiProvider): string;
//# sourceMappingURL=models.d.ts.map