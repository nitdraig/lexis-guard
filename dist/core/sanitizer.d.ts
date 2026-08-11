import type { Finding } from '../types/finding.js';
/**
 * Replaces target hostnames and IPs with redaction tokens.
 * Keeps the mapping local-only (never sent to AI providers).
 */
export declare class Sanitizer {
    private readonly allowedTargets;
    private tokenCounter;
    private readonly redactionMap;
    constructor(allowedTargets: string[]);
    /**
     * Replace every occurrence of allowed target domains/IPs in text
     * with a redaction token.
     */
    sanitize(text: string): string;
    /**
     * Sanitize a finding's evidence field without mutating other fields.
     */
    sanitizeFinding<T extends Finding>(finding: T): T;
    /**
     * Local-only map: token -> original domain.
     * Never leaves the process.
     */
    getRedactionMap(): ReadonlyMap<string, string>;
    private getToken;
}
//# sourceMappingURL=sanitizer.d.ts.map