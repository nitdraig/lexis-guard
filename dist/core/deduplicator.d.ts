import type { Finding, Severity } from '../types/finding.js';
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
export declare function deduplicate(findings: Finding[]): DedupedFinding[];
//# sourceMappingURL=deduplicator.d.ts.map