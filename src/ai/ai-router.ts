import type { AIProvider, TriageOutput, SynthesisOutput, ConsultOutput } from './ai-provider.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import { createHash } from 'node:crypto';

function cacheKey(f: DedupedFinding): string {
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
  private readonly triageProvider: AIProvider;
  private readonly synthesisProvider: AIProvider;
  private readonly triageCache = new Map<string, TriageOutput['findings'][number]>();

  constructor(triageProvider: AIProvider, synthesisProvider: AIProvider) {
    this.triageProvider = triageProvider;
    this.synthesisProvider = synthesisProvider;
  }

  async triage(findings: DedupedFinding[]): Promise<TriageOutput> {
    const uncached: DedupedFinding[] = [];
    const cached: TriageOutput['findings'] = [];

    for (const f of findings) {
      const key = cacheKey(f);
      const hit = this.triageCache.get(key);
      if (hit) {
        cached.push(hit);
      } else {
        uncached.push(f);
      }
    }

    let triaged: TriageOutput['findings'] = [];
    if (uncached.length > 0) {
      const result = await this.triageProvider.triage(uncached);
      for (const item of result.findings) {
        const key = cacheKey(uncached.find((f) => f.hash === item.hash)!);
        this.triageCache.set(key, item);
      }
      triaged = result.findings;
    }

    return { findings: [...cached, ...triaged] };
  }

  async synthesize(findings: DedupedFinding[]): Promise<SynthesisOutput> {
    return this.synthesisProvider.synthesize(findings);
  }

  /** Interactive consultation routed to the synthesis (powerful) provider. */
  async consult(question: string, findings: DedupedFinding[]): Promise<ConsultOutput> {
    return this.synthesisProvider.consult(question, findings);
  }

  /** Exposed for testing / inspection. */
  getCacheSize(): number {
    return this.triageCache.size;
  }

  /** Provider ids of the active triage and synthesis providers. */
  getProviderIds(): [string, string] {
    return [this.triageProvider.id, this.synthesisProvider.id];
  }
}
