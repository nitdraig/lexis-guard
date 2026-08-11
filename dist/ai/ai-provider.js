import { z } from 'zod';
/**
 * Structured output schema for AI triage.
 * The AI must NOT overwrite the deterministic score — only annotate.
 */
export const triageOutputSchema = z.object({
    findings: z.array(z.object({
        hash: z.string(),
        /** AI classification: true positive, false positive, or needs review. */
        classification: z.enum(['true_positive', 'false_positive', 'needs_review']),
        /** Business impact explanation (1-2 sentences). */
        impact: z.string().min(1),
        /** Recommended remediation (high-level, not auto-applied). */
        remediation: z.string().min(1)
    }))
});
/**
 * Structured output schema for AI synthesis.
 */
export const synthesisOutputSchema = z.object({
    summary: z.string().min(1),
    top_risks: z.array(z.object({
        rule_id: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        rationale: z.string().min(1)
    })),
    overall_posture: z.enum(['healthy', 'needs_attention', 'critical'])
});
/**
 * Structured output schema for interactive consultation.
 * The user asks a question about findings and gets a plain-text answer.
 */
export const consultOutputSchema = z.object({
    answer: z.string().min(1)
});
//# sourceMappingURL=ai-provider.js.map