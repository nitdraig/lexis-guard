import { describe, it, expect } from 'vitest';
import { validateScope, canonicalizeTarget } from '../../src/core/scope-guard.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function makeConfig(targets: string[]): Lexisrc {
  return {
    scope: { allowed_targets: targets, environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
    auth: {
      profiles: {
        a: { type: 'bearer', token: 't', role: 'standard', owns: ['r:1'] },
        b: { type: 'bearer', token: 't', role: 'standard', owns: ['r:2'] },
        admin: { type: 'bearer', token: 't', role: 'admin', owns: [] }
      }
    },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

describe('validateScope', () => {
  it('allows an exact hostname match', () => {
    const result = validateScope('api.empresa.com', makeConfig(['api.empresa.com']));
    expect(result.ok).toBe(true);
  });

  it('allows a full URL when hostname is in allowlist', () => {
    const result = validateScope('https://api.empresa.com/v1/users', makeConfig(['api.empresa.com']));
    expect(result.ok).toBe(true);
  });

  it('rejects a hostname not in allowlist', () => {
    const result = validateScope('evil.com', makeConfig(['api.empresa.com']));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('evil.com');
    expect(result.reason).toContain('not in the allowed list');
  });

  it('rejects a subdomain not explicitly listed', () => {
    const result = validateScope('sub.api.empresa.com', makeConfig(['api.empresa.com']));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('sub.api.empresa.com');
  });

  it('rejects an invalid URL', () => {
    const result = validateScope('ht!tp://bad[url', makeConfig(['api.empresa.com']));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('Invalid target URL');
  });

  it('is case-insensitive for hostnames', () => {
    const result = validateScope('API.EMPRESA.COM', makeConfig(['api.empresa.com']));
    expect(result.ok).toBe(true);
  });

  it('allows any of multiple targets', () => {
    const cfg = makeConfig(['api.empresa.com', 'api2.empresa.com']);
    expect(validateScope('api2.empresa.com', cfg).ok).toBe(true);
  });
});

describe('canonicalizeTarget', () => {
  it('adds https scheme to a bare hostname', () => {
    const result = canonicalizeTarget('api.empresa.com');
    expect(result).toEqual({ ok: true, url: 'https://api.empresa.com' });
  });

  it('keeps an existing scheme', () => {
    const result = canonicalizeTarget('http://api.empresa.com');
    expect(result).toEqual({ ok: true, url: 'http://api.empresa.com' });
  });

  it('drops path and query, keeping the origin', () => {
    const result = canonicalizeTarget('https://api.empresa.com/v1/users?id=1');
    expect(result).toEqual({ ok: true, url: 'https://api.empresa.com' });
  });

  it('rejects an invalid URL', () => {
    const result = canonicalizeTarget('ht!tp://bad[url');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('Invalid target URL');
  });
});
