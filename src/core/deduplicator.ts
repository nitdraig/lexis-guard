import type { Finding, Severity } from '../types/finding.js';

const severityRank: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

function worse(a: Severity, b: Severity): Severity {
  return severityRank[a] >= severityRank[b] ? a : b;
}

export interface DedupedFinding extends Finding {
  /** How many times this finding was observed. */
  count: number;
  /** The worst severity seen across all duplicates. */
  worst_case: Severity;
}

/**
 * Deduplicates findings by deterministic hash.
 * Returns aggregated findings with count and worst_case severity.
 */
export function deduplicate(findings: Finding[]): DedupedFinding[] {
  const groups = new Map<string, Finding[]>();

  for (const f of findings) {
    const list = groups.get(f.hash) ?? [];
    list.push(f);
    groups.set(f.hash, list);
  }

  const result: DedupedFinding[] = [];
  for (const [, list] of groups) {
    const first = list[0];
    let worst: Severity = first.severity;
    for (const f of list) {
      worst = worse(worst, f.severity);
    }
    result.push({
      ...first,
      count: list.length,
      worst_case: worst
    });
  }

  return result;
}
