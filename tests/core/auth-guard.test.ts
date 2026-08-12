import { describe, it, expect } from 'vitest';
import { getAuthHeaders, resolveAuthProfiles } from '../../src/core/auth-guard.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function makeConfig(
  profiles: Lexisrc['auth']['profiles']
): Lexisrc {
  return {
    scope: { allowed_targets: ['api.empresa.com'], environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
    auth: { profiles },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

describe('getAuthHeaders', () => {
  it('returns Bearer header', () => {
    const headers = getAuthHeaders({ type: 'bearer', token: 'abc123', role: 'standard', owns: [] });
    expect(headers).toEqual({ Authorization: 'Bearer abc123' });
  });

  it('returns API-Key header', () => {
    const headers = getAuthHeaders({ type: 'api_key', token: 'key-42', role: 'standard', owns: [] });
    expect(headers).toEqual({ 'X-API-Key': 'key-42' });
  });

  it('returns Basic header with base64', () => {
    const headers = getAuthHeaders({ type: 'basic', token: 'user:pass', role: 'standard', owns: [] });
    expect(headers.Authorization).toBe('Basic ' + Buffer.from('user:pass').toString('base64'));
  });
});

describe('resolveAuthProfiles', () => {
  it('resolves standard and admin profiles', () => {
    const cfg = makeConfig({
      user_a: { type: 'bearer', token: 'ta', role: 'standard', owns: ['order:1001'] },
      user_b: { type: 'bearer', token: 'tb', role: 'standard', owns: ['order:2001'] },
      admin: { type: 'bearer', token: 'tadmin', role: 'admin', owns: [] }
    });

    const result = resolveAuthProfiles(cfg);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.standard)).toEqual(['user_a', 'user_b']);
    expect(Object.keys(result.admin)).toEqual(['admin']);
  });

  it('fails when fewer than 2 standard profiles', () => {
    const cfg = makeConfig({
      user_a: { type: 'bearer', token: 'ta', role: 'standard', owns: ['order:1001'] },
      admin: { type: 'bearer', token: 'tadmin', role: 'admin', owns: [] }
    });

    const result = resolveAuthProfiles(cfg);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('BOLA'))).toBe(true);
  });

  it('fails when no admin profile', () => {
    const cfg = makeConfig({
      user_a: { type: 'bearer', token: 'ta', role: 'standard', owns: ['order:1001'] },
      user_b: { type: 'bearer', token: 'tb', role: 'standard', owns: ['order:2001'] }
    });

    const result = resolveAuthProfiles(cfg);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('BFLA'))).toBe(true);
  });

  it('reports both errors when both conditions fail', () => {
    const cfg = makeConfig({
      user_a: { type: 'bearer', token: 'ta', role: 'standard', owns: ['order:1001'] }
    });

    const result = resolveAuthProfiles(cfg);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('BOLA');
    expect(result.errors[1]).toContain('BFLA');
  });
});
