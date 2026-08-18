import { describe, it, expect } from 'vitest';
import { computeRiskScore, withRiskScore } from '../../src/core/risk-score.js';
import type { DedupedFinding } from '../../src/core/deduplicator.js';

describe('computeRiskScore', () => {
  it('returns undefined when CVSS is undefined', () => {
    expect(computeRiskScore(undefined, 5)).toBeUndefined();
  });

  it('equals cvss for a single observation', () => {
    expect(computeRiskScore(7.0, 1)).toBe(7.0);
  });

  it('amplifies with frequency', () => {
    expect(computeRiskScore(7.0, 2)).toBe(14.0);
    expect(computeRiskScore(7.0, 4)).toBe(21.0);
  });
});

describe('withRiskScore', () => {
  it('attaches riskScore to findings', () => {
    const finding: DedupedFinding = {
      hash: 'h1',
      rule_id: 'R',
      method: 'GET',
      path: '/',
      description: 'd',
      severity: 'high',
      evidence: 'e',
      cvss: 5.0,
      count: 2,
      worst_case: 'high'
    };
    const [scored] = withRiskScore([finding]);
    expect(scored.riskScore).toBe(10.0);
  });
});
