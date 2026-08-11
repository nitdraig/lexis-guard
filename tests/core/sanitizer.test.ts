import { describe, it, expect } from 'vitest';
import { Sanitizer } from '../../src/core/sanitizer.js';

describe('Sanitizer', () => {
  it('replaces allowed target domain with token', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const out = s.sanitize('Request to https://api.empresa.com/users failed');
    expect(out).toBe('Request to https://TARGET_REDACTED_01/users failed');
  });

  it('handles multiple targets', () => {
    const s = new Sanitizer(['api.empresa.com', 'api2.empresa.com']);
    const out = s.sanitize('api.empresa.com and api2.empresa.com');
    expect(out).toContain('TARGET_REDACTED_01');
    expect(out).toContain('TARGET_REDACTED_02');
  });

  it('is case-insensitive', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const out = s.sanitize('API.EMPRESA.COM');
    expect(out).toBe('TARGET_REDACTED_01');
  });

  it('sanitizes a finding without mutating other fields', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const finding = {
      hash: 'abc',
      rule_id: 'MISSING_HSTS',
      method: 'GET',
      path: '/',
      description: 'Missing HSTS header',
      severity: 'medium' as const,
      evidence: 'Response from api.empresa.com lacks Strict-Transport-Security'
    };

    const sanitized = s.sanitizeFinding(finding);
    expect(sanitized.evidence).toContain('TARGET_REDACTED_01');
    expect(sanitized.rule_id).toBe('MISSING_HSTS');
    expect(sanitized.description).toBe('Missing HSTS header');
  });

  it('exposes redaction map locally', () => {
    const s = new Sanitizer(['api.empresa.com']);
    s.sanitize('api.empresa.com');
    expect(s.getRedactionMap().get('api.empresa.com')).toBe('TARGET_REDACTED_01');
  });
});
