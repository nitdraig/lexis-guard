import { describe, it, expect } from 'vitest';
import { OAuthModule } from '../../src/modules/oauth-module.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function stubConfig(overrides?: Partial<Lexisrc>): Lexisrc {
  return {
    scope: { allowed_targets: ['api.example.com'], environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
    auth: {
      profiles: {
        oauth_user: { type: 'oauth2', token: 't', role: 'standard', owns: ['r:1'] }
      }
    },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    plugins: {},
    websocket: {},
    fuzzing: { wordlists: [], mutations: 5, max_cases: 100 },
    oauth: { redirect_uri: 'http://localhost/callback', pkce: false },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 },
    ...overrides
  };
}

describe('OAuthModule', () => {
  it('flags a weak localhost redirect URI', async () => {
    const engine = new HttpEngine({ baseUrl: 'http://api.example.com', concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new OAuthModule();
    const findings = await mod.run('http://api.example.com', stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'OAUTH_WEAK_REDIRECT_URI')).toBe(true);
    await engine.close();
  });

  it('produces no findings without OAuth profiles', async () => {
    const engine = new HttpEngine({ baseUrl: 'http://api.example.com', concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new OAuthModule();
    const noOauth = stubConfig({
      auth: { profiles: { a: { type: 'bearer', token: 't', role: 'standard', owns: ['r:1'] } } }
    });
    const findings = await mod.run('http://api.example.com', noOauth, engine);
    expect(findings).toHaveLength(0);
    await engine.close();
  });
});
