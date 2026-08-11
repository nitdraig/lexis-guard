import { describe, it, expect } from 'vitest';
import { LocalProvider } from '../../src/ai/local-provider.js';
import { OpenAIProvider } from '../../src/ai/openai-provider.js';
import { AIRouter } from '../../src/ai/ai-router.js';
import type { DedupedFinding } from '../../src/core/deduplicator.js';

function makeFinding(ruleId: string, severity: DedupedFinding['severity']): DedupedFinding {
  return {
    hash: `hash-${ruleId}`,
    rule_id: ruleId,
    method: 'GET',
    path: '/',
    description: `Finding for ${ruleId}`,
    severity,
    evidence: 'evidence',
    count: 1,
    worst_case: severity
  };
}

describe('LocalProvider', () => {
  it('triage classifies info as false_positive and others as true_positive', async () => {
    const provider = new LocalProvider();
    const findings = [
      makeFinding('MISSING_HSTS', 'medium'),
      makeFinding('STACK_LEAK', 'info')
    ];

    const result = await provider.triage(findings);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].classification).toBe('true_positive');
    expect(result.findings[1].classification).toBe('false_positive');
  });

  it('synthesize returns overall posture based on severity', async () => {
    const provider = new LocalProvider();

    const critical = await provider.synthesize([makeFinding('X', 'critical')]);
    expect(critical.overall_posture).toBe('critical');

    const high = await provider.synthesize([makeFinding('X', 'high')]);
    expect(high.overall_posture).toBe('needs_attention');

    const low = await provider.synthesize([makeFinding('X', 'low')]);
    expect(low.overall_posture).toBe('healthy');
  });
});

describe('AIRouter', () => {
  it('uses cache on second triage of same rule+severity', async () => {
    const triageProvider = new LocalProvider();
    const synthesisProvider = new LocalProvider();
    const router = new AIRouter(triageProvider, synthesisProvider);

    const findings = [makeFinding('MISSING_HSTS', 'medium')];

    await router.triage(findings);
    expect(router.getCacheSize()).toBe(1);

    // Same rule_id + worst_case => cache hit
    const findings2 = [makeFinding('MISSING_HSTS', 'medium')];
    const result2 = await router.triage(findings2);
    expect(router.getCacheSize()).toBe(1);
    expect(result2.findings).toHaveLength(1);
    expect(result2.findings[0].hash).toBe('hash-MISSING_HSTS');
  });

  it('synthesize delegates to synthesis provider', async () => {
    const router = new AIRouter(new LocalProvider(), new LocalProvider());
    const findings = [makeFinding('Y', 'high')];
    const result = await router.synthesize(findings);
    expect(result.overall_posture).toBe('needs_attention');
    expect(result.summary).toContain('1 unique findings');
  });

  it('consult returns an answer mentioning prioritized risks', async () => {
    const router = new AIRouter(new LocalProvider(), new LocalProvider());
    const findings = [
      makeFinding('NO_RATE_LIMIT', 'high'),
      makeFinding('STACK_LEAK', 'low')
    ];

    const result = await router.consult('como arreglo el rate limit?', findings);
    expect(result.answer).toContain('NO_RATE_LIMIT');
    expect(result.answer).toContain('2 unique findings');
  });

  it('consult delegates to the synthesis provider', async () => {
    const router = new AIRouter(new LocalProvider(), new OpenAIProvider());
    const result = await router.consult('hay algo critico?', [makeFinding('X', 'critical')]);
    expect(result.answer).toContain('X');
  });

  it('consult declines clearly off-topic questions', async () => {
    const router = new AIRouter(new LocalProvider(), new LocalProvider());
    const result = await router.consult('tell me a joke', [makeFinding('X', 'high')]);
    expect(result.answer).toContain('scoped');
  });
});
