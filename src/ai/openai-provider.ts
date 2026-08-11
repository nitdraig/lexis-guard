import type { AIProvider, TriageOutput, SynthesisOutput, ConsultOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';

/**
 * OpenAI provider stub.
 * In production this would call the OpenAI API via the Vercel AI SDK.
 * For now it returns deterministic mock output identical to LocalProvider.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';

  async triage(findings: DedupedFinding[]): Promise<TriageOutput> {
    return {
      findings: findings.map((f) => ({
        hash: f.hash,
        classification: f.severity === 'info' ? 'false_positive' : 'true_positive',
        impact: `Impact of ${f.rule_id}: ${f.description}`,
        remediation: `Review and fix ${f.rule_id}`
      }))
    };
  }

  async synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput> {
    const hasCritical = findings.some((f) => f.worst_case === 'critical' || f.severity === 'critical');
    const hasHigh = findings.some((f) => f.worst_case === 'high' || f.severity === 'high');

    return {
      summary: `Audited ${findings.length} unique findings.`,
      top_risks: findings.slice(0, 3).map((f) => ({
        rule_id: f.rule_id,
        priority: (f.worst_case ?? f.severity) as 'low' | 'medium' | 'high' | 'critical',
        rationale: f.description
      })),
      overall_posture: hasCritical ? 'critical' : hasHigh ? 'needs_attention' : 'healthy'
    };
  }

  async consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput> {
    const topRisks = findings
      .filter((f) => f.worst_case === 'high' || f.worst_case === 'critical')
      .slice(0, 3);
    const topText =
      topRisks.length > 0
        ? topRisks.map((f) => `${f.rule_id} (${f.worst_case})`).join(', ')
        : 'no high-risk findings';

    return {
      answer: [
        `Question: ${question}`,
        `Analysis of ${findings.length} unique findings. Top risks (${topText}).`,
        topRisks.length > 0
          ? 'Recommendation: fix the high/critical findings first, in the order listed.'
          : 'Current posture has no high risks; still review the low/medium findings.'
      ].join('\n')
    };
  }
}
