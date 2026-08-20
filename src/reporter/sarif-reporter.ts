import type { Reporter, ReportMeta } from './reporter.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
import { COMPLIANCE_DISCLAIMER } from './compliance-mapping.js';

/**
 * SARIF v2.1.0 reporter with CWE/CVSS mapping and native suppressions.
 */
export class SarifReporter implements Reporter {
  readonly format = 'sarif';

  generate(
    findings: DedupedFinding[],
    meta: ReportMeta,
    lexisignore?: Lexisignore
  ): string {
    const report = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'LexisGuard-CLI',
              version: '0.1.0',
              informationUri: 'https://github.com/lexisguard/cli'
            }
          },
          invocations: [
            {
              executionSuccessful: !meta.incomplete,
              startTimeUtc: meta.timestamp
            }
          ],
          results: findings.map((f, index) => this.toResult(f, index)),
          suppressions: this.toSuppressions(lexisignore),
          properties: this.hasCompliance(findings)
            ? { compliance_disclaimer: COMPLIANCE_DISCLAIMER }
            : undefined
        }
      ]
    };

    return JSON.stringify(report, null, 2);
  }

  private toResult(f: DedupedFinding, _index: number): unknown {
    const result: Record<string, unknown> = {
      ruleId: f.rule_id,
      message: { text: f.description },
      level: this.severityToLevel(f.worst_case ?? f.severity),
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: f.path },
            region: { startLine: 1 }
          }
        }
      ],
      properties: {
        method: f.method,
        count: f.count,
        worst_case: f.worst_case,
        evidence: f.evidence,
        cvss_dast: f.cvss ?? null,
        risk_score: f.riskScore ?? null,
        owasp: f.owasp ?? null,
        compliance: f.compliance ?? null
      }
    };

    if (f.cwe) {
      result.taxa = [
        {
          toolComponent: {
            name: 'CWE',
            index: 0
          },
          id: f.cwe.replace('CWE-', ''),
          name: f.cwe
        }
      ];
    }

    return result;
  }

  private severityToLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'note';
      default:
        return 'warning';
    }
  }

  private toSuppressions(lexisignore?: Lexisignore): unknown[] | undefined {
    if (!lexisignore || lexisignore.ignore.length === 0) {
      return undefined;
    }

    return lexisignore.ignore.map((entry) => ({
      kind: 'external',
      justification: entry.reason,
      properties: {
        rule_id: entry.rule_id,
        path: entry.path,
        method: entry.method,
        approved_by: entry.approved_by,
        expires: entry.expires
      }
    }));
  }

  private hasCompliance(findings: DedupedFinding[]): boolean {
    return findings.some((f) => f.compliance && Object.keys(f.compliance).length > 0);
  }
}
