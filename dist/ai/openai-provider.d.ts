import type { AIProvider, TriageOutput, SynthesisOutput, ConsultOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';
/**
 * OpenAI provider stub.
 * In production this would call the OpenAI API via the Vercel AI SDK.
 * For now it returns deterministic mock output identical to LocalProvider.
 */
export declare class OpenAIProvider implements AIProvider {
    readonly id = "openai";
    triage(findings: DedupedFinding[]): Promise<TriageOutput>;
    synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput>;
    consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput>;
}
//# sourceMappingURL=openai-provider.d.ts.map