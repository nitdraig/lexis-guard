import { readFileSync } from 'node:fs';
import type { Finding } from '../types/finding.js';
import type { AuditLogEntry } from '../core/audit-log.js';

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
 * Read audit log entries from file.
 */
function readLogEntries(logPath: string): AuditLogEntry[] {
  try {
    const raw = readFileSync(logPath, 'utf-8');
    return raw
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as AuditLogEntry);
  } catch {
    return [];
  }
}

/**
 * Compare current findings against the most recent previous run
 * for the same target. Returns trending information.
 */
export function computeTrend(
  currentFindings: Finding[],
  logPath: string,
  target: string
): TrendResult {
  const entries = readLogEntries(logPath);

  // Find the most recent previous run for the same target
  const previous = entries
    .filter((e) => e.target === target)
    .pop();

  if (!previous) {
    return {
      resolved: [],
      new: currentFindings.map((f) => f.hash),
      persistent: [],
      previousRunAt: null,
      previousCount: 0,
      currentCount: currentFindings.length
    };
  }

  // lexis: audit log does not store full findings, only counts.
  // For true diff we would need a separate findings database.
  // Here we do a coarse trend based on counts only.
  return {
    resolved: [],
    new: [],
    persistent: [],
    previousRunAt: previous.timestamp,
    previousCount: previous.findings_count,
    currentCount: currentFindings.length
  };
}
