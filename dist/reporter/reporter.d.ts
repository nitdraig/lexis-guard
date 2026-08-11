import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
export interface ReportMeta {
    target: string;
    mode: string;
    timestamp: string;
    durationMs: number;
    incomplete: boolean;
}
export interface Reporter {
    readonly format: string;
    generate(findings: DedupedFinding[], meta: ReportMeta, lexisignore?: Lexisignore): string;
}
//# sourceMappingURL=reporter.d.ts.map