import { type AIProvider, type ConsultOutput, type SynthesisOutput, type TriageOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { AiProvider } from './models.js';
export interface CloudProviderOptions {
    provider: AiProvider;
    model: string;
    apiKey: string;
}
/**
 * Real AI provider backed by the Vercel AI SDK: cloud (openai / deepseek / anthropic)
 * and local inference (ollama / lm studio). Uses the model configured in
 * `.lexisrc.json` ai.model; apiKey is only used by the cloud providers.
 */
export declare class CloudProvider implements AIProvider {
    readonly id: string;
    private readonly model;
    constructor(options: CloudProviderOptions);
    private buildModel;
    triage(findings: DedupedFinding[]): Promise<TriageOutput>;
    synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput>;
    consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput>;
}
//# sourceMappingURL=cloud-provider.d.ts.map