import type { Finding } from '../types/finding.js';

/** Redaction token for detected secrets (JWT, bearer, cookies, API keys). */
const SECRET_TOKEN = 'SECRET_REDACTED';

/** Ordered secret patterns. Deterministic replacement — never reversible. */
const SECRET_PATTERNS: RegExp[] = [
  // Bearer tokens: Authorization: Bearer <value>
  /\b(Bearer\s+|token\s*[:=]\s*)([A-Za-z0-9._~+/=-]{12,})/gi,
  // JWT-shaped strings (jwt.io triplets)
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  // Set-Cookie: keep header + cookie name, redact only the value
  /\b(Set-Cookie\s*:\s*[A-Za-z0-9_-]{1,64}=)[^;\s,]{4,}/gi,
  // API key style headers: X-API-Key: <value>, api_key=<value>
  /\b((?:x-)?api[-_]?key\s*[:=]\s*)([A-Za-z0-9._~+/=-]{8,})/gi,
  // Basic auth: Basic <base64>
  /\b(Basic\s+)([A-Za-z0-9+/=]{12,})/gi
];

function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (_match, prefix?: string) => {
      // Keep the prefix (header name / "Bearer ") so evidence stays readable;
      // only the secret value is replaced by a stable token.
      return prefix ? `${prefix}${SECRET_TOKEN}` : SECRET_TOKEN;
    });
  }
  return result;
}

/**
 * Replaces target hostnames and IPs with redaction tokens,
 * and scrubs common secret shapes (jwt/bearer/cookies/api keys).
 * Keeps the mapping local-only (never sent to AI providers).
 */
export class Sanitizer {
  private readonly allowedTargets: string[];
  private tokenCounter = 0;
  private readonly redactionMap = new Map<string, string>();

  constructor(allowedTargets: string[]) {
    this.allowedTargets = allowedTargets.map((t) => t.toLowerCase());
  }

  /**
   * Replace every occurrence of allowed target domains/IPs in text
   * and scrub secret-shaped substrings.
   */
  sanitize(text: string): string {
    let result = text;
    for (const target of this.allowedTargets) {
      const token = this.getToken(target);
      // Simple case-insensitive replace for exact domain names.
      // lexis: no regex for broad IP ranges; upgrade if needed.
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      result = result.replace(re, token);
    }
    return redactSecrets(result);
  }

  /**
   * Sanitize a finding's evidence and description without mutating other fields.
   */
  sanitizeFinding<T extends Finding>(finding: T): T {
    return {
      ...finding,
      description: this.sanitize(finding.description),
      evidence: this.sanitize(finding.evidence)
    };
  }

  /**
   * Local-only map: token -> original domain.
   * Never leaves the process.
   */
  getRedactionMap(): ReadonlyMap<string, string> {
    return this.redactionMap;
  }

  private getToken(target: string): string {
    if (!this.redactionMap.has(target)) {
      this.tokenCounter += 1;
      this.redactionMap.set(target, `TARGET_REDACTED_${String(this.tokenCounter).padStart(2, '0')}`);
    }
    return this.redactionMap.get(target)!;
  }
}
