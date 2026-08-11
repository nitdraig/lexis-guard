import type { AIProvider, TriageOutput, SynthesisOutput, ConsultOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';
/**
 * Stub AI provider that returns deterministic mock output.
 * Useful for testing and offline mode without network calls.
 */
export declare class LocalProvider implements AIProvider {
    readonly id = "local";
    private static readonly OFF_TOPIC;
    triage(findings: DedupedFinding[]): Promise<TriageOutput>;
    synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput>;
    consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput>;
}
//# sourceMappingURL=local-provider.d.ts.map