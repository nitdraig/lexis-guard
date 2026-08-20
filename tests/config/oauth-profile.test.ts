import { describe, it, expect } from 'vitest';
import { resolveOAuthProfiles } from '../../src/config/oauth-profile.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function config(profiles: Lexisrc['auth']['profiles']): Lexisrc {
  return {
    scope: { allowed_targets: ['api.example.com'], environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
    auth: { profiles },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    plugins: {},
    websocket: {},
    fuzzing: { wordlists: [], mutations: 5, max_cases: 100 },
    oauth: {},
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

describe('resolveOAuthProfiles', () => {
  it('extracts only oauth2/oidc profiles', () => {
    const result = resolveOAuthProfiles(config({
      oauth_user: { type: 'oauth2', token: 't', role: 'standard', owns: ['r:1'] },
      oidc_user: { type: 'oidc', token: 't', role: 'standard', owns: ['r:2'] },
      bearer_user: { type: 'bearer', token: 't', role: 'admin', owns: [] }
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profiles.map((p) => p.type)).toEqual(['oauth2', 'oidc']);
    }
  });

  it('returns an empty list when there are no OAuth profiles', () => {
    const result = resolveOAuthProfiles(config({
      a: { type: 'bearer', token: 't', role: 'standard', owns: ['r:1'] }
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profiles).toHaveLength(0);
    }
  });
});
