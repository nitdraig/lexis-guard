import { describe, it, expect } from 'vitest';
import { buildExecutiveSummary, renderExecutiveSummary } from '../../src/reporter/executive-summary.js';
import type { DedupedFinding } from '../../src/core/deduplicator.js';

function finding(ruleId: string, cvss: number, count: number, riskScore: number): DedupedFinding {
  return {
    hash: `h-${ruleId}`,
    rule_id: ruleId,
    method: 'GET',
    path: '/x',
    description: 'd',
    severity: 'high',
    evidence: 'e',
    cvss,
    count,
    worst_case: 'high',
    riskScore
  };
}

describe('buildExecutiveSummary', () => {
  it('returns an empty summary for no findings', () => {
    const summary = buildExecutiveSummary([]);
    expect(summary.score).toBe(0);
    expect(summary.topRisks).toEqual([]);
    expect(summary.severityCounts).toEqual({});
  });

  it('scores and picks the top 3 by risk', () => {
    const findings = [
      finding('A', 9.0, 1, 9.0),
      finding('B', 8.0, 1, 8.0),
      finding('C', 7.0, 1, 7.0),
      finding('D', 6.0, 1, 6.0)
    ];
    const summary = buildExecutiveSummary(findings);
    expect(summary.topRisks.map((f) => f.rule_id)).toEqual(['A', 'B', 'C']);
    expect(summary.score).toBe(7.5);
  });
});

describe('renderExecutiveSummary', () => {
  it('renders a markdown section', () => {
    const lines = renderExecutiveSummary([finding('A', 9.0, 1, 9.0)]);
    expect(lines[0]).toBe('## Executive Summary');
    expect(lines.join('\n')).toContain('A');
  });
});
