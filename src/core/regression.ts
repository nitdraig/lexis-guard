import type { DedupedFinding } from './deduplicator.js';
import type { SavedSession } from './audit-log.js';

export interface RegressionResult {
  /** Findings present in the previous session but not in the current run. */
  resolved: DedupedFinding[];
  /** Findings present in the current run but not in the previous session. */
  new: DedupedFinding[];
  /** Findings present in both sessions. */
  persistent: DedupedFinding[];
}

/**
 * Compare a current run against a previous session by finding hash.
 * The hash identifies rule_id + path + method, so count/severity changes
 * still show up as persistent while true new/resolved findings move buckets.
 */
export function compareSessions(
  previous: SavedSession | null,
  current: DedupedFinding[]
): RegressionResult {
  if (!previous) {
    return { resolved: [], new: current, persistent: [] };
  }

  const previousByHash = new Map(previous.findings.map((f) => [f.hash, f]));

  const resolved: DedupedFinding[] = [];
  const persistent: DedupedFinding[] = [];
  const currentHashes = new Set(current.map((f) => f.hash));

  for (const f of previous.findings) {
    if (currentHashes.has(f.hash)) continue;
    resolved.push(f);
  }

  for (const f of current) {
    if (previousByHash.has(f.hash)) persistent.push(f);
  }

  const newFindings = current.filter((f) => !previousByHash.has(f.hash));

  return { resolved, new: newFindings, persistent };
}
