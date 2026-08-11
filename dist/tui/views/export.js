import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text } from 'ink';
import { Select, TextInput, StatusMessage } from '@inkjs/ui';
import { writeFileSync } from 'node:fs';
import { JsonReporter } from '../../reporter/json-reporter.js';
import { MarkdownReporter } from '../../reporter/markdown-reporter.js';
import { SarifReporter } from '../../reporter/sarif-reporter.js';
const FORMAT_REPORTERS = {
    json: JsonReporter,
    markdown: MarkdownReporter,
    sarif: SarifReporter
};
export function ExportView({ session, onBack }) {
    const [format, setFormat] = useState('json');
    const [message, setMessage] = useState(null);
    const findings = session.findings ?? [];
    const meta = session.meta;
    function doExport(value) {
        const outPath = value.trim();
        if (!outPath) {
            setMessage({ ok: false, text: 'Empty path.' });
            return;
        }
        if (!session.meta)
            return;
        try {
            const reporter = new FORMAT_REPORTERS[format]();
            const content = reporter.generate(findings, session.meta);
            writeFileSync(outPath, content, 'utf-8');
            setMessage({ ok: true, text: `Report exported to ${outPath}` });
        }
        catch (err) {
            setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
        }
    }
    if (findings.length === 0 || !meta) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Export results" }), _jsx(Text, { dimColor: true, children: "Run an audit first to have results to export." }), _jsx(Select, { options: [{ label: '← Back', value: 'back' }], onChange: onBack })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Export results \u2014 ", findings.length, " findings"] }), _jsx(Text, { dimColor: true, children: "Formato:" }), _jsx(Select, { options: [
                    { label: 'JSON', value: 'json' },
                    { label: 'Markdown', value: 'markdown' },
                    { label: 'SARIF', value: 'sarif' }
                ], onChange: (value) => setFormat(value) }), _jsx(Box, { marginTop: 1, children: _jsx(TextInput, { placeholder: `report.${format === 'markdown' ? 'md' : format === 'sarif' ? 'sarif' : 'json'}`, onSubmit: doExport }) }), message && (_jsx(Box, { marginTop: 1, children: message.ok ? (_jsx(StatusMessage, { variant: "success", children: message.text })) : (_jsx(StatusMessage, { variant: "error", children: message.text })) })), _jsx(Box, { marginTop: 1, children: _jsx(Select, { options: [{ label: '← Back', value: 'back' }], onChange: onBack }) })] }));
}
//# sourceMappingURL=export.js.map