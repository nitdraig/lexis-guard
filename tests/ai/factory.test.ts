import { describe, it, expect } from 'vitest';
import { CloudProvider } from '../../src/ai/cloud-provider.js';
import { createAIRouter } from '../../src/ai/factory.js';
import { encryptSecret } from '../../src/config/secret.js';

describe('CloudProvider', () => {
  const key = 'sk-dummy-not-for-real-calls';

  it('constructs a model for each supported provider without network calls', () => {
    // Construction is lazy: the SDK client is created, nothing is sent.
    const openai = new CloudProvider({ provider: 'openai', model: 'gpt-5.4-nano', apiKey: key });
    const deepseek = new CloudProvider({ provider: 'deepseek', model: 'deepseek-v4-flash', apiKey: key });
    const anthropic = new CloudProvider({ provider: 'anthropic', model: 'claude-haiku-4-5-20251001', apiKey: key });

    expect(openai.id).toBe('cloud:openai:gpt-5.4-nano');
    expect(deepseek.id).toBe('cloud:deepseek:deepseek-v4-flash');
    expect(anthropic.id).toBe('cloud:anthropic:claude-haiku-4-5-20251001');
  });
});

describe('createAIRouter', () => {
  it('falls back to local stubs when no API key is configured', () => {
    const router = createAIRouter({ provider: 'openai', model: 'gpt-5.4-nano', api_key: '' });
    expect(router.getProviderIds()).toEqual(['local', 'local']);
  });

  it('uses the cloud provider when an encrypted API key is set', () => {
    const router = createAIRouter({
      provider: 'deepseek',
      model: 'deepseek-v4-pro',
      api_key: encryptSecret('sk-test-key')
    });
    expect(router.getProviderIds()).toEqual([
      'cloud:deepseek:deepseek-v4-pro',
      'cloud:deepseek:deepseek-v4-pro'
    ]);
  });

  it('defaults the model to the provider economical tier when missing', () => {
    const router = createAIRouter({ provider: 'anthropic', api_key: encryptSecret('sk-x') });
    expect(router.getProviderIds()[0]).toBe('cloud:anthropic:claude-haiku-4-5-20251001');
  });

  it('routes local providers to real local inference without any API key', () => {
    const ollamaRouter = createAIRouter({ provider: 'ollama', model: 'llama3.2' });
    expect(ollamaRouter.getProviderIds()).toEqual(['cloud:ollama:llama3.2', 'cloud:ollama:llama3.2']);

    const lmRouter = createAIRouter({ provider: 'lmstudio', model: 'qwen2.5-coder:7b' });
    expect(lmRouter.getProviderIds()).toEqual(['cloud:lmstudio:qwen2.5-coder:7b', 'cloud:lmstudio:qwen2.5-coder:7b']);
  });
});