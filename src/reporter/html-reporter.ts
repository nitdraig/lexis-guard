import type { Reporter, ReportMeta } from './reporter.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
import { buildExecutiveSummary } from './executive-summary.js';
import { COMPLIANCE_DISCLAIMER } from './compliance-mapping.js';

const SEVERITY_COLORS: Record<string, string> = {
  info: '#4aa3df',
  low: '#a3be8c',
  medium: '#ebcb8b',
  high: '#d08770',
  critical: '#bf616a'
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Self-contained HTML report with a findings table and executive summary.
 */
export class HtmlReporter implements Reporter {
  readonly format = 'html';

  generate(
    findings: DedupedFinding[],
    meta: ReportMeta,
    lexisignore?: Lexisignore
  ): string {
    const summary = buildExecutiveSummary(findings);
    const rows = findings
      .map((f) => {
        const severity = f.worst_case ?? f.severity;
        const color = SEVERITY_COLORS[severity] ?? '#ffffff';
        const compliance = f.compliance ? Object.entries(f.compliance).map(([k, v]) => `${k}: ${v}`).join(', ') : '—';
        return `<tr>
  <td><span style="color:${color};font-weight:600">${escapeHtml(severity)}</span></td>
  <td><code>${escapeHtml(f.rule_id)}</code></td>
  <td><code>${escapeHtml(f.method)} ${escapeHtml(f.path)}</code></td>
  <td>${escapeHtml(f.description)}</td>
  <td>${f.count}</td>
  <td>${f.cvss ?? '—'}</td>
  <td>${f.riskScore ?? '—'}</td>
  <td>${f.owasp ? escapeHtml(f.owasp) : '—'}</td>
  <td>${escapeHtml(compliance)}</td>
</tr>`;
      })
      .join('\n');

    const suppressions = lexisignore?.ignore ?? [];

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>LexisGuard Audit Report</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color: #1f2328; }
  h1 { border-bottom: 2px solid #d0d7de; padding-bottom: 0.5rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #d0d7de; padding: 0.5rem; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  code { background: #f6f8fa; padding: 0.1rem 0.3rem; border-radius: 3px; }
  .meta { display: flex; gap: 2rem; flex-wrap: wrap; }
</style>
</head>
<body>
<h1>LexisGuard Audit Report</h1>
<div class="meta">
  <div><strong>Target:</strong> ${escapeHtml(meta.target)}</div>
  <div><strong>Mode:</strong> ${escapeHtml(meta.mode)}</div>
  <div><strong>Timestamp:</strong> ${escapeHtml(meta.timestamp)}</div>
  <div><strong>Duration:</strong> ${(meta.durationMs / 1000).toFixed(1)}s</div>
  <div><strong>Incomplete:</strong> ${meta.incomplete ? 'Yes' : 'No'}</div>
</div>

<h2>Executive Summary</h2>
<p><strong>Global risk score:</strong> ${summary.score}</p>
<p><strong>Severity counts:</strong> ${Object.entries(summary.severityCounts)
      .map(([s, c]) => `${s} (${c})`)
      .join(', ') || 'none'}</p>
${summary.topRisks.length > 0 ? `<h3>Top risks</h3><ul>${summary.topRisks
      .map((f) => `<li><code>${escapeHtml(f.rule_id)}</code> on <code>${escapeHtml(f.method)} ${escapeHtml(f.path)}</code> — risk ${f.riskScore ?? f.cvss ?? 'n/a'}</li>`)
      .join('')}</ul>` : ''}

<h2>Findings (${findings.length})</h2>
<table>
<thead>
<tr>
  <th>Severity</th><th>Rule</th><th>Location</th><th>Description</th>
  <th>Count</th><th>CVSS</th><th>Risk</th><th>OWASP</th><th>Compliance</th>
</tr>
</thead>
<tbody>
${rows || '<tr><td colspan="9">No findings</td></tr>'}
</tbody>
</table>

${suppressions.length > 0 ? `<h2>Suppressions</h2><ul>${suppressions
      .map((s) => `<li><code>${escapeHtml(s.rule_id)}</code> on <code>${escapeHtml(s.method)} ${escapeHtml(s.path)}</code> — ${escapeHtml(s.reason)}</li>`)
      .join('')}</ul>` : ''}

${findings.some((f) => f.compliance && Object.keys(f.compliance).length > 0)
      ? `<p><small>${escapeHtml(COMPLIANCE_DISCLAIMER)}</small></p>` : ''}

<p><small>CVSS scores are DAST-based estimates, not certified.</small></p>
</body>
</html>`;
  }
}
