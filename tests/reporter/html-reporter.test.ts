import { describe, it, expect } from 'vitest';
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

const FINDING: DedupedFinding = {
  hash: 'h1',
  rule_id: 'BOLA_ACCESS_CROSS_USER',
  method: 'GET',
  path: '/orders/1',
  description: 'Cross-user access',
  severity: 'high',
  evidence: 'e',
  cvss: 8.1,
  count: 2,
  worst_case: 'high',
  riskScore: 16.2,
  owasp: 'API1:2023'
};

describe('HtmlReporter', () => {
  it('renders a self-contained HTML document', () => {
    const reporter = new HtmlReporter();
    const html = reporter.generate([FINDING], META);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('LexisGuard Audit Report');
    expect(html).toContain('BOLA_ACCESS_CROSS_USER');
  });

  it('escapes HTML in finding data', () => {
    const reporter = new HtmlReporter();
    const injected: DedupedFinding = {
      ...FINDING,
      description: '<script>alert(1)</script>'
    };
    const html = reporter.generate([injected], META);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders an empty state when there are no findings', () => {
    const reporter = new HtmlReporter();
    const html = reporter.generate([], META);
    expect(html).toContain('No findings');
  });
});
