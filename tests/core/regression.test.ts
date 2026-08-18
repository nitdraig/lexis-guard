import { describe, it, expect } from 'vitest';
import { compareSessions } from '../../src/core/regression.js';
import type { SavedSession } from '../../src/core/audit-log.js';
import type { DedupedFinding } from '../../src/core/deduplicator.js';

function finding(hash: string, ruleId: string): DedupedFinding {
  return {
    hash,
    rule_id: ruleId,
    method: 'GET',
    path: '/x',
    description: 'd',
    severity: 'low',
    evidence: 'e',
    count: 1,
    worst_case: 'low'
  };
}

const PREVIOUS: SavedSession = {
  meta: { target: 'api.example.com', mode: 'safe', timestamp: '2026-01-01T00:00:00.000Z', durationMs: 10, incomplete: false },
  findings: [finding('h1', 'A'), finding('h2', 'B')]
};

describe('compareSessions', () => {
  it('treats every finding as new when there is no previous session', () => {
    const current = [finding('h1', 'A')];
    const result = compareSessions(null, current);
    expect(result.resolved).toEqual([]);
    expect(result.new).toEqual(current);
    expect(result.persistent).toEqual([]);
  });

  it('separates resolved, new and persistent findings by hash', () => {
    const current = [finding('h2', 'B'), finding('h3', 'C')];
    const result = compareSessions(PREVIOUS, current);

    expect(result.resolved.map((f) => f.hash)).toEqual(['h1']);
    expect(result.new.map((f) => f.hash)).toEqual(['h3']);
    expect(result.persistent.map((f) => f.hash)).toEqual(['h2']);
  });
});
