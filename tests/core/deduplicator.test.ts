import { describe, it, expect } from 'vitest';
import { deduplicate, type DedupedFinding } from '../../src/core/deduplicator.js';
import type { Finding } from '../../src/types/finding.js';

describe('deduplicate', () => {
  it('aggregates duplicate findings by hash', () => {
    const findings: Finding[] = [
      { hash: 'h1', rule_id: 'CORS_WILD_CARD', method: 'GET', path: '/api/data', description: 'CORS wildcard', severity: 'medium', evidence: 'Access-Control-Allow-Origin: *' },
      { hash: 'h1', rule_id: 'CORS_WILD_CARD', method: 'GET', path: '/api/data', description: 'CORS wildcard', severity: 'medium', evidence: 'Access-Control-Allow-Origin: *' },
      { hash: 'h2', rule_id: 'MISSING_HSTS', method: 'GET', path: '/', description: 'No HSTS', severity: 'low', evidence: 'header absent' }
    ];

    const result = deduplicate(findings);
    expect(result).toHaveLength(2);

    const agg = result.find((r) => r.hash === 'h1') as DedupedFinding;
    expect(agg.count).toBe(2);
    expect(agg.worst_case).toBe('medium');

    const single = result.find((r) => r.hash === 'h2') as DedupedFinding;
    expect(single.count).toBe(1);
    expect(single.worst_case).toBe('low');
  });

  it('picks worst severity across duplicates', () => {
    const findings: Finding[] = [
      { hash: 'h1', rule_id: 'X', method: 'GET', path: '/', description: 'd', severity: 'low', evidence: 'e' },
      { hash: 'h1', rule_id: 'X', method: 'GET', path: '/', description: 'd', severity: 'critical', evidence: 'e' },
      { hash: 'h1', rule_id: 'X', method: 'GET', path: '/', description: 'd', severity: 'medium', evidence: 'e' }
    ];

    const result = deduplicate(findings);
    expect(result[0].worst_case).toBe('critical');
    expect(result[0].count).toBe(3);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicate([])).toEqual([]);
  });
});
