export class MarkdownReporter {
    format = 'markdown';
    generate(findings, meta, lexisignore) {
        const lines = [];
        lines.push(`# LexisGuard Audit Report`);
        lines.push('');
        lines.push(`- **Target**: ${meta.target}`);
        lines.push(`- **Mode**: ${meta.mode}`);
        lines.push(`- **Timestamp**: ${meta.timestamp}`);
        lines.push(`- **Duration**: ${(meta.durationMs / 1000).toFixed(1)}s`);
        lines.push(`- **Incomplete**: ${meta.incomplete ? 'Yes' : 'No'}`);
        lines.push('');
        lines.push('## Summary');
        const bySeverity = this.groupBySeverity(findings);
        for (const [sev, count] of Object.entries(bySeverity)) {
            lines.push(`- ${sev}: ${count}`);
        }
        lines.push('');
        lines.push('## Findings');
        for (const f of findings) {
            lines.push(`### ${f.rule_id}`);
            lines.push(`- **Severity**: ${f.worst_case ?? f.severity}`);
            lines.push(`- **Path**: \`${f.method} ${f.path}\``);
            lines.push(`- **Description**: ${f.description}`);
            lines.push(`- **Count**: ${f.count}`);
            if (f.cwe)
                lines.push(`- **CWE**: ${f.cwe}`);
            if (f.cvss !== undefined)
                lines.push(`- **CVSS (DAST)**: ${f.cvss}`);
            lines.push(`- **Evidence**: ${f.evidence}`);
            lines.push('');
        }
        if (lexisignore && lexisignore.ignore.length > 0) {
            lines.push('## Suppressions');
            for (const s of lexisignore.ignore) {
                lines.push(`- **${s.rule_id}** on \`${s.method} ${s.path}\` — ${s.reason} (expires ${s.expires})`);
            }
            lines.push('');
        }
        lines.push('---');
        lines.push('*CVSS scores are DAST-based estimates, not certified.*');
        return lines.join('\n');
    }
    groupBySeverity(findings) {
        const groups = {};
        for (const f of findings) {
            const key = f.worst_case ?? f.severity;
            groups[key] = (groups[key] ?? 0) + 1;
        }
        return groups;
    }
}
//# sourceMappingURL=markdown-reporter.js.map