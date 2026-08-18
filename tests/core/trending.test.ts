import { describe, it, expect } from 'vitest';
import { computeTrend, computeSessionTrend } from '../../src/core/trending.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Finding } from '../../src/types/finding.js';

describe('computeTrend', () => {
  it('returns all as new when no previous log exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const logPath = join(dir, 'nonexistent.log');

    const current: Finding[] = [
      { hash: 'h1', rule_id: 'R1', method: 'GET', path: '/', description: 'd', severity: 'low', evidence: 'e' }
    ];

    const trend = computeTrend(current, logPath, 'api.example.com');
    expect(trend.new).toHaveLength(1);
    expect(trend.previousCount).toBe(0);
    expect(trend.currentCount).toBe(1);
    expect(trend.previousRunAt).toBeNull();
  });

  it('compares counts against previous run for same target', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const logPath = join(dir, 'audit.log');

    const entries = [
      { timestamp: '2024-01-01T00:00:00Z', target: 'api.example.com', mode: 'safe', checks: ['security'], findings_count: 5, incomplete: false },
      { timestamp: '2024-01-02T00:00:00Z', target: 'api.example.com', mode: 'safe', checks: ['security'], findings_count: 3, incomplete: false },
      { timestamp: '2024-01-03T00:00:00Z', target: 'api.other.com', mode: 'safe', checks: ['security'], findings_count: 10, incomplete: false }
    ];

    writeFileSync(logPath, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

    const current: Finding[] = [
      { hash: 'h1', rule_id: 'R1', method: 'GET', path: '/', description: 'd', severity: 'low', evidence: 'e' },
      { hash: 'h2', rule_id: 'R2', method: 'GET', path: '/', description: 'd', severity: 'medium', evidence: 'e' }
    ];

    const trend = computeTrend(current, logPath, 'api.example.com');
    expect(trend.previousRunAt).toBe('2024-01-02T00:00:00Z');
    expect(trend.previousCount).toBe(3);
    expect(trend.currentCount).toBe(2);
  });
});

describe('computeSessionTrend', () => {
  it('returns a zero baseline when no previous session exists', () => {
    const trend = computeSessionTrend(
      { timestamp: '2024-01-02T00:00:00Z', findingsCount: 4 },
      null
    );
    expect(trend.previousRunAt).toBeNull();
    expect(trend.previousCount).toBe(0);
    expect(trend.currentCount).toBe(4);
    expect(trend.delta).toBe(4);
  });

  it('computes a count delta against the previous session', () => {
    const trend = computeSessionTrend(
      { timestamp: '2024-01-03T00:00:00Z', findingsCount: 2 },
      { timestamp: '2024-01-02T00:00:00Z', findingsCount: 5 }
    );
    expect(trend.previousRunAt).toBe('2024-01-02T00:00:00Z');
    expect(trend.previousCount).toBe(5);
    expect(trend.currentCount).toBe(2);
    expect(trend.delta).toBe(-3);
  });
});
