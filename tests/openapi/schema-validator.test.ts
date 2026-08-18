import { describe, it, expect } from 'vitest';
import { validateResponseSchema } from '../../src/openapi/schema-validator.js';

describe('validateResponseSchema', () => {
  it('accepts a body that matches the schema', () => {
    const result = validateResponseSchema(
      { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      { id: 'abc' }
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('reports type mismatch and missing required fields', () => {
    const result = validateResponseSchema(
      { type: 'object', required: ['id', 'name'], properties: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'not-a-number' }
    );
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.keyword === 'type')).toBe(true);
    expect(result.violations.some((v) => v.keyword === 'required')).toBe(true);
  });

  it('reports additional properties by default', () => {
    const result = validateResponseSchema(
      { type: 'object', properties: { id: { type: 'string' } }, additionalProperties: false },
      { id: 'abc', extra: true }
    );
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.keyword === 'additionalProperties')).toBe(true);
  });
});
