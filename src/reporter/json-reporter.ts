import type { Reporter, ReportMeta } from './reporter.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
import { COMPLIANCE_DISCLAIMER } from './compliance-mapping.js';

export class JsonReporter implements Reporter {
  readonly format = 'json';

  generate(
    findings: DedupedFinding[],
    meta: ReportMeta,
    lexisignore?: Lexisignore
  ): string {
    const hasCompliance = findings.some((f) => f.compliance && Object.keys(f.compliance).length > 0);
    const report = {
      meta,
      summary: {
        total: findings.length,
        by_severity: this.groupBySeverity(findings)
      },
      findings,
      suppressions: lexisignore?.ignore ?? [],
      disclaimer: hasCompliance ? COMPLIANCE_DISCLAIMER : undefined
    };
    return JSON.stringify(report, null, 2);
  }

  private groupBySeverity(findings: DedupedFinding[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const f of findings) {
      const key = f.worst_case ?? f.severity;
      groups[key] = (groups[key] ?? 0) + 1;
    }
    return groups;
  }
}
