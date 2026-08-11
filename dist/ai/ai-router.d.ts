import type { AIProvider, TriageOutput, SynthesisOutput, ConsultOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';
/**
 * Two-level AI router:
 * - Level A (Triage): cheap/local provider, per-finding.
 * - Level B (Synthesis): powerful provider, once per audit.
 *
 * Includes an in-memory cache for triage results keyed by
 * `rule_id + worst_case` hash.
 */
export declare class AIRouter {
    private readonly triageProvider;
    private readonly synthesisProvider;
    private readonly triageCache;
    constructor(triageProvider: AIProvider, synthesisProvider: AIProvider);
    triage(findings: DedupedFinding[]): Promise<TriageOutput>;
    synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput>;
    /** Interactive consultation routed to the synthesis (powerful) provider. */
    consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput>;
    /** Exposed for testing / inspection. */
    getCacheSize(): number;
    /** Provider ids of the active triage and synthesis providers. */
    getProviderIds(): [string, string];
}
//# sourceMappingURL=ai-router.d.ts.map