import type { AIProvider, TriageOutput, SynthesisOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';

/**
 * Stub AI provider that returns deterministic mock output.
 * Useful for testing and offline mode without network calls.
 */
export class LocalProvider implements AIProvider {
  readonly id = 'local';

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
}
