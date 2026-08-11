import { describe, it, expect } from 'vitest';
import {
  AI_PROVIDERS,
  AI_MODEL_CATALOG,
  LOCAL_PROVIDERS,
  isLocalProvider,
  modelsForProvider,
  defaultModel
} from '../../src/ai/models.js';

describe('AI model catalog', () => {
  it('exposes the five supported providers (three cloud, two local)', () => {
    expect(AI_PROVIDERS).toEqual(['openai', 'deepseek', 'anthropic', 'ollama', 'lmstudio']);
    expect(LOCAL_PROVIDERS).toEqual(['ollama', 'lmstudio']);
    expect(isLocalProvider('ollama')).toBe(true);
    expect(isLocalProvider('lmstudio')).toBe(true);
    expect(isLocalProvider('openai')).toBe(false);
  });

  it('provides six base models for openai and anthropic, two per tier', () => {
    for (const provider of ['openai', 'anthropic']) {
      const models = modelsForProvider(provider as 'openai' | 'anthropic');
      expect(models).toHaveLength(6);
      const tiers = models.map((m) => m.tier);
      expect(tiers.filter((t) => t === 'economical')).toHaveLength(2);
      expect(tiers.filter((t) => t === 'balanced')).toHaveLength(2);
      expect(tiers.filter((t) => t === 'top')).toHaveLength(2);
    }
  });

  it('deepseek exposes only its two current V4 models', () => {
    const models = modelsForProvider('deepseek');
    expect(models.map((m) => m.id)).toEqual(['deepseek-v4-flash', 'deepseek-v4-pro']);
  });

  it('defaultModel picks the first economical model of the provider', () => {
    expect(defaultModel('openai')).toBe('gpt-5.4-nano');
    expect(defaultModel('deepseek')).toBe('deepseek-v4-flash');
    expect(defaultModel('anthropic')).toBe('claude-haiku-4-5-20251001');
  });

  it('defaultModel is empty for local providers (models vary per machine)', () => {
    expect(defaultModel('ollama')).toBe('');
    expect(defaultModel('lmstudio')).toBe('');
    expect(modelsForProvider('ollama')).toEqual([]);
    expect(modelsForProvider('lmstudio')).toEqual([]);
  });

  it('catalog only references known providers', () => {
    const known = new Set(AI_PROVIDERS);
    for (const model of AI_MODEL_CATALOG) {
      expect(known.has(model.provider)).toBe(true);
    }
  });
});