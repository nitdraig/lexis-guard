import { describe, it, expect } from 'vitest';
import { mapOwaspCategories, OWASP_MAP } from '../../src/reporter/owasp-mapping.js';
import type { Finding } from '../../src/types/finding.js';

describe('OWASP mapping', () => {
  it('maps known rules to API Top 10 categories', () => {
    const finding: Finding = {
      hash: 'h1',
      rule_id: 'BOLA_ACCESS_CROSS_USER',
      method: 'GET',
      path: '/orders/1',
      description: 'd',
      severity: 'high',
      evidence: 'e'
    };
    const [mapped] = mapOwaspCategories([finding]);
    expect(mapped.owasp).toBe('API1:2023');
  });

  it('leaves unmapped rules without an owasp field', () => {
    const finding: Finding = {
      hash: 'h2',
      rule_id: 'UNKNOWN_RULE',
      method: 'GET',
      path: '/',
      description: 'd',
      severity: 'low',
      evidence: 'e'
    };
    const [mapped] = mapOwaspCategories([finding]);
    expect(mapped.owasp).toBeUndefined();
  });

  it('covers the injection rule ids in the map', () => {
    expect(OWASP_MAP.SQLI_ERROR_BASED).toBe('API8:2023');
    expect(OWASP_MAP.SQLI_BLIND_BOOLEAN).toBe('API8:2023');
    expect(OWASP_MAP.NOSQL_INJECTION).toBe('API8:2023');
    expect(OWASP_MAP.COMMAND_INJECTION).toBe('API8:2023');
    expect(OWASP_MAP.PATH_TRAVERSAL).toBe('API8:2023');
  });

  it('maps auth and misconfiguration-adjacent rules', () => {
    expect(OWASP_MAP.JWT_IN_COOKIE).toBe('API2:2023');
    expect(OWASP_MAP.PRIVATE_KEY_EXPOSED).toBe('API2:2023');
    expect(OWASP_MAP.TLS_DOWNGRADE).toBe('API8:2023');
  });
});
