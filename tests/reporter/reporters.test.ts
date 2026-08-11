import { describe, it, expect } from 'vitest';
import { JsonReporter } from '../../src/reporter/json-reporter.js';
import { MarkdownReporter } from '../../src/reporter/markdown-reporter.js';
import { SarifReporter } from '../../src/reporter/sarif-reporter.js';
import type { DedupedFinding } from '../../src/core/deduplicator.js';
import type { Lexisignore } from '../../src/config/lexisignore-schema.js';

function makeFinding(ruleId: string, severity: DedupedFinding['severity'], cwe?: string, cvss?: number): DedupedFinding {
  return {
    hash: `hash-${ruleId}`,
    rule_id: ruleId,
    method: 'GET',
    path: '/api/data',
    description: `Description of ${ruleId}`,
    severity,
    evidence: 'evidence text',
    count: 2,
    worst_case: severity,
    cwe,
    cvss
  };
}

function meta() {
  return {
    target: 'api.empresa.com',
    mode: 'safe',
    timestamp: new Date().toISOString(),
    durationMs: 5000,
    incomplete: false
  };
}

const lexisignore: Lexisignore = {
  ignore: [
    {
      hash: 'abc',
      rule_id: 'CORS_WILD_CARD',
      path: '/api/public',
      method: 'GET',
      reason: 'Public by design',
      approved_by: 'agustin@empresa.com',
      expires: '2026-12-31'
    }
  ]
};

describe('JsonReporter', () => {
  it('generates valid JSON with meta and findings', () => {
    const reporter = new JsonReporter();
    const findings = [makeFinding('MISSING_HSTS', 'medium', 'CWE-319', 5.3)];
    const out = reporter.generate(findings, meta(), lexisignore);
    const parsed = JSON.parse(out);

    expect(parsed.meta.target).toBe('api.empresa.com');
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.findings[0].rule_id).toBe('MISSING_HSTS');
    expect(parsed.summary.by_severity.medium).toBe(1);
    expect(parsed.suppressions).toHaveLength(1);
  });
});

describe('MarkdownReporter', () => {
  it('generates markdown with headers and finding sections', () => {
    const reporter = new MarkdownReporter();
    const findings = [makeFinding('CORS_WILD_CARD', 'high', 'CWE-942', 7.5)];
    const out = reporter.generate(findings, meta(), lexisignore);

    expect(out).toContain('# LexisGuard Audit Report');
    expect(out).toContain('CORS_WILD_CARD');
    expect(out).toContain('high');
    expect(out).toContain('CVSS (DAST)');
    expect(out).toContain('Public by design');
    expect(out).toContain('*CVSS scores are DAST-based estimates');
  });
});

describe('SarifReporter', () => {
  it('generates SARIF 2.1.0 with results and suppressions', () => {
    const reporter = new SarifReporter();
    const findings = [makeFinding('MISSING_HSTS', 'medium', 'CWE-319', 5.3)];
    const out = reporter.generate(findings, meta(), lexisignore);
    const parsed = JSON.parse(out);

    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].tool.driver.name).toBe('LexisGuard-CLI');
    expect(parsed.runs[0].results).toHaveLength(1);
    expect(parsed.runs[0].results[0].ruleId).toBe('MISSING_HSTS');
    expect(parsed.runs[0].results[0].level).toBe('warning');
    expect(parsed.runs[0].results[0].properties.cvss_dast).toBe(5.3);
    expect(parsed.runs[0].suppressions).toHaveLength(1);
    expect(parsed.runs[0].suppressions[0].kind).toBe('external');
  });

  it('maps critical/high severity to error level', () => {
    const reporter = new SarifReporter();
    const findings = [
      makeFinding('X', 'critical'),
      makeFinding('Y', 'high'),
      makeFinding('Z', 'low')
    ];
    const out = reporter.generate(findings, meta());
    const parsed = JSON.parse(out);

    expect(parsed.runs[0].results[0].level).toBe('error');
    expect(parsed.runs[0].results[1].level).toBe('error');
    expect(parsed.runs[0].results[2].level).toBe('note');
  });
});
