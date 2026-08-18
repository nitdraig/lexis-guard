import type { DedupedFinding } from './deduplicator.js';

/**
 * Composite risk score: base CVSS amplified by observed frequency.
 * A finding seen many times carries more operational risk than a one-off.
 */
export function computeRiskScore(cvss: number | undefined, count: number): number | undefined {
  if (cvss === undefined || Number.isNaN(cvss)) return undefined;
  const n = Math.max(1, count);
  return Number((cvss * (1 + Math.log2(n))).toFixed(2));
}

/** Attach a composite risk score to every deduplicated finding. */
export function withRiskScore(findings: DedupedFinding[]): DedupedFinding[] {
  return findings.map((f) => ({
    ...f,
    riskScore: computeRiskScore(f.cvss, f.count)
  }));
}
