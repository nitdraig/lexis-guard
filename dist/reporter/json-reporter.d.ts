import type { Reporter, ReportMeta } from './reporter.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
export declare class JsonReporter implements Reporter {
    readonly format = "json";
    generate(findings: DedupedFinding[], meta: ReportMeta, lexisignore?: Lexisignore): string;
    private groupBySeverity;
}
//# sourceMappingURL=json-reporter.d.ts.map