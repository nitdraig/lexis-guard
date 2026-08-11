import { describe, it, expect } from 'vitest';
import { defaultRawLexisrc } from '../../src/config/default.js';
import { loadRawConfig } from '../../src/config/loader.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('defaultRawLexisrc', () => {
  it('always has 3 auth profiles (user_a, user_b, admin)', () => {
    const raw = defaultRawLexisrc();
    expect(Object.keys(raw.auth.profiles)).toEqual(['user_a', 'user_b', 'admin']);
    expect(raw.auth.profiles.admin.role).toBe('admin');
  });

  it('keeps tokens as env placeholders, never literal secrets', () => {
    const raw = defaultRawLexisrc();
    for (const profile of Object.values(raw.auth.profiles)) {
      expect(profile.token).toMatch(/^\$\{LEXIS_/);
    }
  });

  it('starts with no allowed targets and safe mode', () => {
    const raw = defaultRawLexisrc();
    expect(raw.scope.allowed_targets).toEqual([]);
    expect(raw.mode).toBe('safe');
    expect(raw.ai.provider).toBe('openai');
    expect(raw.ai.model).toBe('gpt-5.4-nano');
    expect(raw.ai.api_key).toBe('');
  });
});

describe('loadRawConfig', () => {
  it('returns raw config without interpolating env vars', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const path = join(dir, '.lexisrc.json');
    writeFileSync(
      path,
      JSON.stringify({
        scope: { allowed_targets: ['api.example.com'], environment: 'staging' },
        mode: 'safe',
        auth: {
          profiles: {
            user_a: { type: 'bearer', token: '${LEXIS_USER_A_TOKEN}', role: 'standard', owns: [] },
            user_b: { type: 'bearer', token: '${LEXIS_USER_B_TOKEN}', role: 'standard', owns: [] },
            admin: { type: 'bearer', token: '${LEXIS_ADMIN_TOKEN}', role: 'admin', owns: [] }
          }
        },
        ai: { provider: 'openai', redact_target: true, local_fallback: true }
      }),
      'utf-8'
    );

    const raw = loadRawConfig(path);
    expect(raw.auth.profiles.user_a.token).toBe('${LEXIS_USER_A_TOKEN}');
    expect(raw.scope.allowed_targets).toContain('api.example.com');
  });

  it('throws when the file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    expect(() => loadRawConfig(join(dir, 'missing.json'))).toThrow();
  });
});