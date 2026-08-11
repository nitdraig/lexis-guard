/**
 * Replaces target hostnames and IPs with redaction tokens.
 * Keeps the mapping local-only (never sent to AI providers).
 */
export class Sanitizer {
    allowedTargets;
    tokenCounter = 0;
    redactionMap = new Map();
    constructor(allowedTargets) {
        this.allowedTargets = allowedTargets.map((t) => t.toLowerCase());
    }
    /**
     * Replace every occurrence of allowed target domains/IPs in text
     * with a redaction token.
     */
    sanitize(text) {
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
    sanitizeFinding(finding) {
        return {
            ...finding,
            evidence: this.sanitize(finding.evidence)
        };
    }
    /**
     * Local-only map: token -> original domain.
     * Never leaves the process.
     */
    getRedactionMap() {
        return this.redactionMap;
    }
    getToken(target) {
        if (!this.redactionMap.has(target)) {
            this.tokenCounter += 1;
            this.redactionMap.set(target, `TARGET_REDACTED_${String(this.tokenCounter).padStart(2, '0')}`);
        }
        return this.redactionMap.get(target);
    }
}
//# sourceMappingURL=sanitizer.js.map