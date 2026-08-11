import { createHash } from 'node:crypto';
function cacheKey(f) {
    return createHash('sha256').update(`${f.rule_id}:${f.worst_case}`).digest('hex').slice(0, 16);
}
/**
 * Two-level AI router:
 * - Level A (Triage): cheap/local provider, per-finding.
 * - Level B (Synthesis): powerful provider, once per audit.
 *
 * Includes an in-memory cache for triage results keyed by
 * `rule_id + worst_case` hash.
 */
export class AIRouter {
    triageProvider;
    synthesisProvider;
    triageCache = new Map();
    constructor(triageProvider, synthesisProvider) {
        this.triageProvider = triageProvider;
        this.synthesisProvider = synthesisProvider;
    }
    async triage(findings) {
        const uncached = [];
        const cached = [];
        for (const f of findings) {
            const key = cacheKey(f);
            const hit = this.triageCache.get(key);
            if (hit) {
                cached.push(hit);
            }
            else {
                uncached.push(f);
            }
        }
        let triaged = [];
        if (uncached.length > 0) {
            const result = await this.triageProvider.triage(uncached);
            for (const item of result.findings) {
                const key = cacheKey(uncached.find((f) => f.hash === item.hash));
                this.triageCache.set(key, item);
            }
            triaged = result.findings;
        }
        return { findings: [...cached, ...triaged] };
    }
    async synthesize(findings) {
        return this.synthesisProvider.synthesize(findings);
    }
    /** Interactive consultation routed to the synthesis (powerful) provider. */
    async consult(question, findings) {
        return this.synthesisProvider.consult(question, findings);
    }
    /** Exposed for testing / inspection. */
    getCacheSize() {
        return this.triageCache.size;
    }
    /** Provider ids of the active triage and synthesis providers. */
    getProviderIds() {
        return [this.triageProvider.id, this.synthesisProvider.id];
    }
}
//# sourceMappingURL=ai-router.js.map