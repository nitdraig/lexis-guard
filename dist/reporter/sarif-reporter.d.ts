import type { Reporter, ReportMeta } from './reporter.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
/**
 * SARIF v2.1.0 reporter with CWE/CVSS mapping and native suppressions.
 */
export declare class SarifReporter implements Reporter {
    readonly format = "sarif";
    generate(findings: DedupedFinding[], meta: ReportMeta, lexisignore?: Lexisignore): string;
    private toResult;
    private severityToLevel;
    private toSuppressions;
}
//# sourceMappingURL=sarif-reporter.d.ts.map