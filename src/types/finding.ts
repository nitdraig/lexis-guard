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
  /** OWASP API Security Top 10 category (e.g. "API1:2023"). */
  owasp?: string;
  /** Fuzzing: the payload that produced this finding. */
  payload?: string;
  /** Fuzzing: mutation strategy that produced this finding. */
  mutation?: string;
  /** Compliance mappings, keyed by framework (informational only). */
  compliance?: Record<string, string>;
}
