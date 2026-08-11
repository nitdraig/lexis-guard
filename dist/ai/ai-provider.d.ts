import { z } from 'zod';
import type { DedupedFinding } from '../core/deduplicator.js';
/**
 * Structured output schema for AI triage.
 * The AI must NOT overwrite the deterministic score — only annotate.
 */
export declare const triageOutputSchema: z.ZodObject<{
    findings: z.ZodArray<z.ZodObject<{
        hash: z.ZodString;
        /** AI classification: true positive, false positive, or needs review. */
        classification: z.ZodEnum<["true_positive", "false_positive", "needs_review"]>;
        /** Business impact explanation (1-2 sentences). */
        impact: z.ZodString;
        /** Recommended remediation (high-level, not auto-applied). */
        remediation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hash: string;
        classification: "true_positive" | "false_positive" | "needs_review";
        impact: string;
        remediation: string;
    }, {
        hash: string;
        classification: "true_positive" | "false_positive" | "needs_review";
        impact: string;
        remediation: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    findings: {
        hash: string;
        classification: "true_positive" | "false_positive" | "needs_review";
        impact: string;
        remediation: string;
    }[];
}, {
    findings: {
        hash: string;
        classification: "true_positive" | "false_positive" | "needs_review";
        impact: string;
        remediation: string;
    }[];
}>;
export type TriageOutput = z.infer<typeof triageOutputSchema>;
/**
 * Structured output schema for AI synthesis.
 */
export declare const synthesisOutputSchema: z.ZodObject<{
    summary: z.ZodString;
    top_risks: z.ZodArray<z.ZodObject<{
        rule_id: z.ZodString;
        priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
        rationale: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rule_id: string;
        priority: "low" | "medium" | "high" | "critical";
        rationale: string;
    }, {
        rule_id: string;
        priority: "low" | "medium" | "high" | "critical";
        rationale: string;
    }>, "many">;
    overall_posture: z.ZodEnum<["healthy", "needs_attention", "critical"]>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    top_risks: {
        rule_id: string;
        priority: "low" | "medium" | "high" | "critical";
        rationale: string;
    }[];
    overall_posture: "critical" | "healthy" | "needs_attention";
}, {
    summary: string;
    top_risks: {
        rule_id: string;
        priority: "low" | "medium" | "high" | "critical";
        rationale: string;
    }[];
    overall_posture: "critical" | "healthy" | "needs_attention";
}>;
export type SynthesisOutput = z.infer<typeof synthesisOutputSchema>;
/**
 * Structured output schema for interactive consultation.
 * The user asks a question about findings and gets a plain-text answer.
 */
export declare const consultOutputSchema: z.ZodObject<{
    answer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    answer: string;
}, {
    answer: string;
}>;
export type ConsultOutput = z.infer<typeof consultOutputSchema>;
/**
 * AI Provider interface.
 * Implementations: LocalProvider (Ollama stub), AnthropicProvider, GeminiProvider.
 */
export interface AIProvider {
    readonly id: string;
    /** Level A — Triage: classify each finding. High frequency. */
    triage(findings: DedupedFinding[]): Promise<TriageOutput>;
    /** Level B — Synthesis: executive summary and prioritization. Low frequency. */
    synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput>;
    /** Interactive: answer a user question about the given findings. */
    consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput>;
}
//# sourceMappingURL=ai-provider.d.ts.map