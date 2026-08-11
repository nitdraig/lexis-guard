import type { Reporter, ReportMeta } from './reporter.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
export declare class MarkdownReporter implements Reporter {
    readonly format = "markdown";
    generate(findings: DedupedFinding[], meta: ReportMeta, lexisignore?: Lexisignore): string;
    private groupBySeverity;
}
//# sourceMappingURL=markdown-reporter.d.ts.map