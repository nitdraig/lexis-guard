export class JsonReporter {
    format = 'json';
    generate(findings, meta, lexisignore) {
        const report = {
            meta,
            summary: {
                total: findings.length,
                by_severity: this.groupBySeverity(findings)
            },
            findings,
            suppressions: lexisignore?.ignore ?? []
        };
        return JSON.stringify(report, null, 2);
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
//# sourceMappingURL=json-reporter.js.map