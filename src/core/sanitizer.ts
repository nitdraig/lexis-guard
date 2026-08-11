import type { Finding } from '../types/finding.js';

/**
 * Replaces target hostnames and IPs with redaction tokens.
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
   * with a redaction token.
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
    return result;
  }

  /**
   * Sanitize a finding's evidence field without mutating other fields.
   */
  sanitizeFinding<T extends Finding>(finding: T): T {
    return {
      ...finding,
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
