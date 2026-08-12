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

  it('redacts bearer tokens', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const out = s.sanitize('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.token.value');
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(out).toContain('SECRET_REDACTED');
  });

  it('redacts JWT-shaped strings', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const out = s.sanitize(`cookie=${jwt}`);
    expect(out).not.toContain(jwt);
    expect(out).toContain('SECRET_REDACTED');
  });

  it('redacts API key style headers but keeps the header name', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const out = s.sanitize('X-API-Key: sk-proj-abcdefghijkl123456');
    expect(out).not.toContain('sk-proj-abcdefghijkl123456');
    expect(out).toContain('X-API-Key:');
    expect(out).toContain('SECRET_REDACTED');
  });

  it('keeps Set-Cookie name but redacts the value', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const out = s.sanitize('Set-Cookie: session=abc123secret456; Path=/');
    expect(out).not.toContain('abc123secret456');
    expect(out).toContain('session=');
    expect(out).toContain('SECRET_REDACTED');
  });

  it('sanitizes description alongside evidence', () => {
    const s = new Sanitizer(['api.empresa.com']);
    const finding = {
      hash: 'abc',
      rule_id: 'MISSING_HSTS',
      method: 'GET',
      path: '/',
      description: 'Token eyJwYXlsb2Fk.eyJzdWIiOiIxIn0.abc123def456ghi789 in response',
      severity: 'medium' as const,
      evidence: 'Bearer abcdefghijkl1234567890'
    };
    const sanitized = s.sanitizeFinding(finding);
    expect(sanitized.description).not.toContain('eyJwYXlsb2Fk');
    expect(sanitized.evidence).not.toContain('abcdefghijkl1234567890');
    expect(sanitized.rule_id).toBe('MISSING_HSTS');
  });
});
