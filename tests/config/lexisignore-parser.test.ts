import { describe, it, expect } from 'vitest';
import {
  parseLexisignore,
  parseLexisignoreStrict
} from '../../src/config/lexisignore-parser.js';
import { generateFindingHash } from '../../src/utils/finding-hash.js';

describe('parseLexisignore', () => {
  it('parses a valid .lexisignore file', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'a1b2c3d4e5f6',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Endpoint publico por diseno',
          approved_by: 'agustin@empresa.com',
          expires: '2026-12-31'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.ignore).toHaveLength(1);
    expect(result.data.ignore[0].rule_id).toBe('CORS_WILD_CARD');
    expect(result.data.ignore[0].method).toBe('GET');
  });

  it('returns error for invalid JSON', () => {
    const result = parseLexisignore('not-json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toBe('Invalid JSON');
  });

  it('returns error for missing required fields', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: '',
          rule_id: 'CORS_WILD_CARD'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('hash'))).toBe(true);
  });

  it('returns error for invalid email in approved_by', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'abc123',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Public by design',
          approved_by: 'not-an-email',
          expires: '2026-12-31'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('approved_by'))).toBe(true);
  });

  it('returns error for invalid expires date', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'abc123',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Public by design',
          approved_by: 'agustin@empresa.com',
          expires: 'not-a-date'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('expires'))).toBe(true);
  });

  it('returns error loudly when an entry is expired', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'a1b2c3d4e5f6',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Endpoint publico por diseno',
          approved_by: 'agustin@empresa.com',
          expires: '2020-01-01'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Expired ignore entry');
    expect(result.errors[0]).toContain('a1b2c3d4e5f6');
    expect(result.errors[0]).toContain('CORS_WILD_CARD');
  });

  it('returns multiple errors for multiple expired entries', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'a1b2c3d4e5f6',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Public by design',
          approved_by: 'agustin@empresa.com',
          expires: '2020-01-01'
        },
        {
          hash: 'b2c3d4e5f6a7',
          rule_id: 'MISSING_HSTS',
          path: '/',
          method: 'GET',
          reason: 'Internal only',
          approved_by: 'ops@empresa.com',
          expires: '2020-06-15'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('CORS_WILD_CARD');
    expect(result.errors[1]).toContain('MISSING_HSTS');
  });

  it('accepts a valid parsed object directly (non-string)', () => {
    const obj = {
      ignore: [
        {
          hash: 'abc123',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Public by design',
          approved_by: 'agustin@empresa.com',
          expires: '2026-12-31'
        }
      ]
    };

    const result = parseLexisignore(obj);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.ignore).toHaveLength(1);
  });

  it('normalizes method to uppercase', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'abc123',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'get',
          reason: 'Public by design',
          approved_by: 'agustin@empresa.com',
          expires: '2026-12-31'
        }
      ]
    });

    const result = parseLexisignore(content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.ignore[0].method).toBe('GET');
  });

  it('allows empty ignore array', () => {
    const content = JSON.stringify({ ignore: [] });
    const result = parseLexisignore(content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.ignore).toHaveLength(0);
  });
});

describe('parseLexisignoreStrict', () => {
  it('returns data for valid input', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'abc123',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Public by design',
          approved_by: 'agustin@empresa.com',
          expires: '2026-12-31'
        }
      ]
    });

    const data = parseLexisignoreStrict(content);
    expect(data.ignore).toHaveLength(1);
  });

  it('throws on expired entries (loud CI failure)', () => {
    const content = JSON.stringify({
      ignore: [
        {
          hash: 'a1b2c3d4e5f6',
          rule_id: 'CORS_WILD_CARD',
          path: '/api/v1/public-data',
          method: 'GET',
          reason: 'Public by design',
          approved_by: 'agustin@empresa.com',
          expires: '2020-01-01'
        }
      ]
    });

    expect(() => parseLexisignoreStrict(content)).toThrow('Expired ignore entry');
  });
});

describe('generateFindingHash', () => {
  it('produces a deterministic 12-char hex hash', () => {
    const h1 = generateFindingHash('CORS_WILD_CARD', '/api/v1/public-data', 'GET');
    const h2 = generateFindingHash('CORS_WILD_CARD', '/api/v1/public-data', 'GET');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{12}$/);
  });

  it('produces different hashes for different inputs', () => {
    const h1 = generateFindingHash('CORS_WILD_CARD', '/api/v1/public-data', 'GET');
    const h2 = generateFindingHash('CORS_WILD_CARD', '/api/v1/public-data', 'POST');
    expect(h1).not.toBe(h2);
  });

  it('normalizes method case', () => {
    const h1 = generateFindingHash('RULE', '/path', 'GET');
    const h2 = generateFindingHash('RULE', '/path', 'get');
    expect(h1).toBe(h2);
  });
});
