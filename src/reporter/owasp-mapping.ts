import type { Finding } from '../types/finding.js';

/**
 * Maps rule_id to an OWASP API Security Top 10 (2023) category.
 */
export const OWASP_MAP: Record<string, string> = {
  // Broken Object Level Authorization
  BOLA_ACCESS_CROSS_USER: 'API1:2023',
  // Broken Authentication
  BROKEN_AUTH: 'API2:2023',
  JWT_ALG_NONE_ACCEPTED: 'API2:2023',
  JWT_WEAK_SECRET: 'API2:2023',
  JWT_IN_COOKIE: 'API2:2023',
  PRIVATE_KEY_EXPOSED: 'API2:2023',
  // Broken Object Property Level Authorization (mass assignment)
  MASS_ASSIGNMENT: 'API3:2023',
  // Unrestricted Resource Consumption
  NO_RATE_LIMIT: 'API4:2023',
  SOAK_TEST_FAILURES: 'API4:2023',
  // Broken Function Level Authorization
  BFLA_ADMIN_ACCESS: 'API5:2023',
  // Unrestricted Access to Sensitive Business Flows (placeholder)
  // Server-Side Request Forgery
  SSRF_INTERNAL_PROBE_REFLECTED: 'API7:2023',
  // Security Misconfiguration
  MISSING_HSTS: 'API8:2023',
  MISSING_X_FRAME_OPTIONS: 'API8:2023',
  MISSING_X_CONTENT_TYPE_OPTIONS: 'API8:2023',
  MISSING_CSP: 'API8:2023',
  CORS_WILD_CARD: 'API8:2023',
  STACK_LEAK: 'API8:2023',
  SENSITIVE_FILE_EXPOSURE: 'API8:2023',
  SCHEMA_CONTRACT_VIOLATION: 'API8:2023',
  TLS_DOWNGRADE: 'API8:2023',
  SQLI_ERROR_BASED: 'API8:2023',
  SQLI_BLIND_BOOLEAN: 'API8:2023',
  NOSQL_INJECTION: 'API8:2023',
  COMMAND_INJECTION: 'API8:2023',
  PATH_TRAVERSAL: 'API8:2023',
  // Improper Inventory Management (placeholder)
  // Unsafe Consumption of APIs (placeholder)
  // Data exposure / secrets
  DATA_EXPOSURE: 'API3:2023',
  API_KEY_EXPOSED: 'API3:2023',
  PASSWORD_EXPOSED: 'API3:2023'
};

/**
 * Attach the OWASP category to a finding when a mapping exists.
 * Missing mappings are left as-is (undefined `owasp`).
 */
export function withOwaspCategory<T extends Finding>(finding: T): T {
  const owasp = OWASP_MAP[finding.rule_id];
  if (!owasp) return finding;
  return { ...finding, owasp };
}

export function mapOwaspCategories<T extends Finding>(findings: T[]): T[] {
  return findings.map((f) => withOwaspCategory(f));
}
