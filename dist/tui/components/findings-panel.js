import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
const severityColor = {
    info: 'gray',
    low: 'green',
    medium: 'yellow',
    high: 'red',
    critical: 'redBright'
};
export function FindingsPanel({ findings, maxDisplay = 20 }) {
    const bySeverity = {};
    for (const f of findings) {
        const key = f.severity;
        bySeverity[key] = (bySeverity[key] ?? 0) + 1;
    }
    return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsxs(Text, { bold: true, children: ["Findings (", findings.length, ")"] }), _jsx(Box, { gap: 2, children: Object.entries(bySeverity).map(([sev, count]) => (_jsxs(Text, { color: severityColor[sev] ?? 'white', children: [sev, ": ", count] }, sev))) }), findings.slice(0, maxDisplay).map((f, i) => (_jsxs(Box, { gap: 1, children: [_jsxs(Text, { color: severityColor[f.severity] ?? 'white', children: ["[", f.severity.toUpperCase(), "]"] }), _jsx(Text, { dimColor: true, children: f.rule_id }), _jsx(Text, { children: f.path })] }, i))), findings.length > maxDisplay && (_jsxs(Text, { dimColor: true, children: ["...and ", findings.length - maxDisplay, " more"] }))] }));
}
//# sourceMappingURL=findings-panel.js.map