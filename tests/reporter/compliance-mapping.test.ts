import { describe, it, expect } from 'vitest';
import {
  mapComplianceCategories,
  COMPLIANCE_MAP,
  COMPLIANCE_DISCLAIMER
} from '../../src/reporter/compliance-mapping.js';
import { JsonReporter } from '../../src/reporter/json-reporter.js';
import { MarkdownReporter } from '../../src/reporter/markdown-reporter.js';
import { SarifReporter } from '../../src/reporter/sarif-reporter.js';
import { HtmlReporter } from '../../src/reporter/html-reporter.js';
import type { DedupedFinding } from '../../src/core/deduplicator.js';
import type { ReportMeta } from '../../src/reporter/reporter.js';

const META: ReportMeta = {
  target: 'api.example.com',
  mode: 'safe',
  timestamp: '2026-01-01T00:00:00.000Z',
  durationMs: 1000,
  incomplete: false
};

function finding(ruleId: string): DedupedFinding {
  return {
    hash: `h-${ruleId}`,
    rule_id: ruleId,
    method: 'GET',
    path: '/x',
    description: 'd',
    severity: 'high',
    evidence: 'e',
    count: 1,
    worst_case: 'high'
  };
}

describe('compliance mapping', () => {
  it('maps known rules to framework controls', () => {
    expect(COMPLIANCE_MAP.BOLA_ACCESS_CROSS_USER.nist_csf).toBe('PR.AC-4');
  });

  it('attaches only the requested frameworks', () => {
    const [mapped] = mapComplianceCategories([finding('BOLA_ACCESS_CROSS_USER')], ['nist_csf', 'soc2']);
    expect(mapped.compliance).toEqual({ nist_csf: 'PR.AC-4', soc2: 'CC6.3' });
  });

  it('leaves unmapped rules without compliance', () => {
    const [mapped] = mapComplianceCategories([finding('UNKNOWN_RULE')], ['nist_csf']);
    expect(mapped.compliance).toBeUndefined();
  });

  it('emits the mandatory disclaimer in every reporter', () => {
    const mapped = mapComplianceCategories([finding('BOLA_ACCESS_CROSS_USER')], ['nist_csf']);
    const json = new JsonReporter().generate(mapped, META);
    const md = new MarkdownReporter().generate(mapped, META);
    const sarif = new SarifReporter().generate(mapped, META);
    const html = new HtmlReporter().generate(mapped, META);

    expect(json).toContain(COMPLIANCE_DISCLAIMER);
    expect(md).toContain(COMPLIANCE_DISCLAIMER);
    expect(sarif).toContain(COMPLIANCE_DISCLAIMER);
    expect(html).toContain(COMPLIANCE_DISCLAIMER);
  });
});
