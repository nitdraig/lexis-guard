import type { Finding } from '../types/finding.js';
export interface TrendResult {
    /** Findings present in previous run but not in current. */
    resolved: string[];
    /** Findings present in current but not in previous. */
    new: string[];
    /** Findings present in both runs. */
    persistent: string[];
    /** Previous run timestamp, if available. */
    previousRunAt: string | null;
    /** Previous findings count. */
    previousCount: number;
    /** Current findings count. */
    currentCount: number;
}
/**
 * Compare current findings against the most recent previous run
 * for the same target. Returns trending information.
 */
export declare function computeTrend(currentFindings: Finding[], logPath: string, target: string): TrendResult;
//# sourceMappingURL=trending.d.ts.map