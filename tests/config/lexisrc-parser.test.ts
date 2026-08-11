import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseLexisrc,
  parseLexisrcStrict
} from '../../src/config/lexisrc-parser.js';

describe('parseLexisrc', () => {
  const validConfig = {
    scope: {
      allowed_targets: ['api.empresa.com'],
      environment: 'staging'
    },
    mode: 'safe',
    auth: {
      profiles: {
        user_a: { type: 'bearer', token: '${LEXIS_USER_A_TOKEN}', role: 'standard', owns: ['order:1001'] },
        user_b: { type: 'bearer', token: '${LEXIS_USER_B_TOKEN}', role: 'standard', owns: ['order:2001'] },
        admin: { type: 'bearer', token: '${LEXIS_ADMIN_TOKEN}', role: 'admin', owns: [] }
      }
    },
    ai: {
      provider: 'anthropic',
      redact_target: true,
      local_fallback: false
    },
    limits: {
      max_concurrent_requests: 20,
      max_requests_per_test: 500,
      abort_on_latency_degradation_pct: 40
    }
  };

  beforeEach(() => {
    process.env.LEXIS_USER_A_TOKEN = 'tok-a';
    process.env.LEXIS_USER_B_TOKEN = 'tok-b';
    process.env.LEXIS_ADMIN_TOKEN = 'tok-admin';
  });

  afterEach(() => {
    delete process.env.LEXIS_USER_A_TOKEN;
    delete process.env.LEXIS_USER_B_TOKEN;
    delete process.env.LEXIS_ADMIN_TOKEN;
  });

  it('parses a valid config with env interpolation', () => {
    const result = parseLexisrc(JSON.stringify(validConfig));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.scope.allowed_targets).toEqual(['api.empresa.com']);
    expect(result.data.auth.profiles.user_a.token).toBe('tok-a');
    expect(result.data.auth.profiles.user_b.token).toBe('tok-b');
    expect(result.data.auth.profiles.admin.token).toBe('tok-admin');
  });

  it('parses a config object directly (non-string)', () => {
    const result = parseLexisrc(validConfig);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.auth.profiles.user_a.token).toBe('tok-a');
  });

  it('returns error for invalid JSON string', () => {
    const result = parseLexisrc('not-json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toBe('Invalid JSON');
  });

  it('returns error when env var is missing', () => {
    delete process.env.LEXIS_ADMIN_TOKEN;
    const result = parseLexisrc(JSON.stringify(validConfig));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain('Missing environment variable(s)');
    expect(result.errors[0]).toContain('LEXIS_ADMIN_TOKEN');
  });

  it('returns error when allowed_targets is empty', () => {
    const cfg = { ...validConfig, scope: { ...validConfig.scope, allowed_targets: [] } };
    const result = parseLexisrc(JSON.stringify(cfg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('allowed_targets'))).toBe(true);
  });

  it('returns error when fewer than 3 auth profiles', () => {
    const cfg = {
      ...validConfig,
      auth: {
        profiles: {
          user_a: validConfig.auth.profiles.user_a,
          admin: validConfig.auth.profiles.admin
        }
      }
    };
    const result = parseLexisrc(JSON.stringify(cfg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('3 profiles'))).toBe(true);
  });

  it('returns error when no admin profile exists', () => {
    const cfg = {
      ...validConfig,
      auth: {
        profiles: {
          user_a: { ...validConfig.auth.profiles.user_a, role: 'standard' },
          user_b: { ...validConfig.auth.profiles.user_b, role: 'standard' },
          user_c: { type: 'bearer', token: '${LEXIS_ADMIN_TOKEN}', role: 'standard', owns: [] }
        }
      }
    };
    const result = parseLexisrc(JSON.stringify(cfg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('admin'))).toBe(true);
  });

  it('returns error when standard profile has empty owns', () => {
    const cfg = {
      ...validConfig,
      auth: {
        profiles: {
          user_a: { ...validConfig.auth.profiles.user_a, owns: [] },
          user_b: validConfig.auth.profiles.user_b,
          admin: validConfig.auth.profiles.admin
        }
      }
    };
    const result = parseLexisrc(JSON.stringify(cfg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('user_a') && e.includes('owns'))).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const minimal = {
      scope: {
        allowed_targets: ['api.empresa.com'],
        environment: 'staging'
      },
      auth: {
        profiles: {
          user_a: { type: 'bearer', token: '${LEXIS_USER_A_TOKEN}', role: 'standard', owns: ['res:1'] },
          user_b: { type: 'bearer', token: '${LEXIS_USER_B_TOKEN}', role: 'standard', owns: ['res:2'] },
          admin: { type: 'bearer', token: '${LEXIS_ADMIN_TOKEN}', role: 'admin', owns: [] }
        }
      },
      ai: { provider: 'ollama' }
    };

    const result = parseLexisrc(JSON.stringify(minimal));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe('safe');
    expect(result.data.ai.redact_target).toBe(true);
    expect(result.data.ai.local_fallback).toBe(false);
    expect(result.data.limits.max_concurrent_requests).toBe(20);
    expect(result.data.limits.max_requests_per_test).toBe(500);
    expect(result.data.limits.abort_on_latency_degradation_pct).toBe(40);
  });

  it('returns error on unknown mode', () => {
    const cfg = { ...validConfig, mode: 'super_aggressive' };
    const result = parseLexisrc(JSON.stringify(cfg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('mode'))).toBe(true);
  });

  it('returns error on unknown ai provider', () => {
    const cfg = { ...validConfig, ai: { ...validConfig.ai, provider: 'openai' } };
    const result = parseLexisrc(JSON.stringify(cfg));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('provider'))).toBe(true);
  });
});

describe('parseLexisrcStrict', () => {
  const validConfig = {
    scope: {
      allowed_targets: ['api.empresa.com'],
      environment: 'staging'
    },
    mode: 'safe',
    auth: {
      profiles: {
        user_a: { type: 'bearer', token: '${LEXIS_USER_A_TOKEN}', role: 'standard', owns: ['order:1001'] },
        user_b: { type: 'bearer', token: '${LEXIS_USER_B_TOKEN}', role: 'standard', owns: ['order:2001'] },
        admin: { type: 'bearer', token: '${LEXIS_ADMIN_TOKEN}', role: 'admin', owns: [] }
      }
    },
    ai: { provider: 'anthropic' },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };

  beforeEach(() => {
    process.env.LEXIS_USER_A_TOKEN = 'tok-a';
    process.env.LEXIS_USER_B_TOKEN = 'tok-b';
    process.env.LEXIS_ADMIN_TOKEN = 'tok-admin';
  });

  afterEach(() => {
    delete process.env.LEXIS_USER_A_TOKEN;
    delete process.env.LEXIS_USER_B_TOKEN;
    delete process.env.LEXIS_ADMIN_TOKEN;
  });

  it('returns parsed config for valid input', () => {
    const data = parseLexisrcStrict(JSON.stringify(validConfig));
    expect(data.scope.allowed_targets).toEqual(['api.empresa.com']);
  });

  it('throws with all errors on invalid input', () => {
    const bad = { ...validConfig, scope: { ...validConfig.scope, allowed_targets: [] } };
    expect(() => parseLexisrcStrict(JSON.stringify(bad))).toThrow();
  });
});
