export const AI_PROVIDERS = ['openai', 'deepseek', 'anthropic', 'ollama', 'lmstudio'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Providers that run inference on the user's machine (no API key). */
export const LOCAL_PROVIDERS = ['ollama', 'lmstudio'] as const;

export type LocalProviderName = (typeof LOCAL_PROVIDERS)[number];

export function isLocalProvider(provider: AiProvider): provider is LocalProviderName {
  return (LOCAL_PROVIDERS as readonly string[]).includes(provider);
}

export type AiTier = 'economical' | 'balanced' | 'top';

export interface AiModelOption {
  id: string;
  provider: AiProvider;
  tier: AiTier;
}

// lexis: current official API model IDs (August 2026). DeepSeek currently
// exposes only V4 flash/pro, so its catalog is smaller; it grows as providers
// ship more models. Tiers: 2 economical, 2 balanced, 2 top per provider.
export const AI_MODEL_CATALOG: AiModelOption[] = [
  { id: 'gpt-5.4-nano', provider: 'openai', tier: 'economical' },
  { id: 'gpt-5.4-mini', provider: 'openai', tier: 'economical' },
  { id: 'gpt-5.4', provider: 'openai', tier: 'balanced' },
  { id: 'gpt-5.3-codex', provider: 'openai', tier: 'balanced' },
  { id: 'gpt-5.5', provider: 'openai', tier: 'top' },
  { id: 'gpt-5.5-pro', provider: 'openai', tier: 'top' },

  { id: 'deepseek-v4-flash', provider: 'deepseek', tier: 'economical' },
  { id: 'deepseek-v4-pro', provider: 'deepseek', tier: 'balanced' },

  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', tier: 'economical' },
  { id: 'claude-sonnet-5', provider: 'anthropic', tier: 'economical' },
  { id: 'claude-sonnet-4-6', provider: 'anthropic', tier: 'balanced' },
  { id: 'claude-opus-5', provider: 'anthropic', tier: 'balanced' },
  { id: 'claude-fable-5', provider: 'anthropic', tier: 'top' },
  { id: 'claude-mythos-5', provider: 'anthropic', tier: 'top' }
];

export function modelsForProvider(provider: AiProvider): AiModelOption[] {
  return AI_MODEL_CATALOG.filter((m) => m.provider === provider);
}

/** Default model for a provider: the first economical tier. Empty for local providers (they vary per machine). */
export function defaultModel(provider: AiProvider): string {
  const model = modelsForProvider(provider).find((m) => m.tier === 'economical');
  return model?.id ?? '';
}