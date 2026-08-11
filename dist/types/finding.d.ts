/**
 * Common finding type shared across all audit modules.
 */
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export interface Finding {
    /** Deterministic hash of rule_id + path + method. */
    hash: string;
    /** OWASP / custom rule identifier. */
    rule_id: string;
    /** HTTP method. */
    method: string;
    /** Target path. */
    path: string;
    /** Human-readable description. */
    description: string;
    /** Severity classification. */
    severity: Severity;
    /** Evidence (headers, body snippet, etc.). */
    evidence: string;
    /** CWE identifier, if applicable. */
    cwe?: string;
    /** CVSS v3.1 score (DAST-based, not certified). */
    cvss?: number;
}
//# sourceMappingURL=finding.d.ts.map