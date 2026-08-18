import type { DedupedFinding } from '../core/deduplicator.js';

export interface ExecutiveSummary {
  score: number;
  severityCounts: Record<string, number>;
  topRisks: DedupedFinding[];
}

/**
 * Build a deterministic executive summary: a global score, severity counts and
 * the top 3 findings by composite risk score.
 */
export function buildExecutiveSummary(findings: DedupedFinding[]): ExecutiveSummary {
  const severityCounts: Record<string, number> = {};
  for (const f of findings) {
    const key = f.worst_case ?? f.severity;
    severityCounts[key] = (severityCounts[key] ?? 0) + 1;
  }

  const sorted = [...findings].sort((a, b) => (b.riskScore ?? b.cvss ?? 0) - (a.riskScore ?? a.cvss ?? 0));
  const topRisks = sorted.slice(0, 3);

  const total = findings.reduce((sum, f) => sum + (f.riskScore ?? f.cvss ?? 0), 0);
  const score = findings.length === 0 ? 0 : Number((total / findings.length).toFixed(2));

  return { score, severityCounts, topRisks };
}

export function renderExecutiveSummary(findings: DedupedFinding[]): string[] {
  const summary = buildExecutiveSummary(findings);
  const lines: string[] = [];
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`- **Global risk score**: ${summary.score}`);
  lines.push(`- **Severity counts**: ${Object.entries(summary.severityCounts).map(([s, c]) => `${s} (${c})`).join(', ') || 'none'}`);
  if (summary.topRisks.length > 0) {
    lines.push('- **Top risks**:');
    for (const f of summary.topRisks) {
      lines.push(`  - \`${f.rule_id}\` on \`${f.method} ${f.path}\` — risk ${f.riskScore ?? f.cvss ?? 'n/a'}`);
    }
  }
  lines.push('');
  return lines;
}
