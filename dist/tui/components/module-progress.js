import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
const statusColor = {
    pending: 'gray',
    running: 'yellow',
    done: 'green',
    error: 'red'
};
const statusLabel = {
    pending: '...',
    running: 'RUNNING',
    done: 'DONE',
    error: 'ERROR'
};
const MODULE_DESCRIPTIONS = {
    security: 'OWASP checks: headers, CORS, sensitive files, JWT cookies, BOLA/BFLA cross-auth',
    performance: 'Latency, TTFB, payload compression, HTTP/2 support',
    scalability: 'Rate-limit burst (10 req), soak load, circuit breaker state'
};
function formatElapsed(ms) {
    if (ms === undefined)
        return '';
    return ` ${(ms / 1000).toFixed(1)}s`;
}
export function ModuleProgress({ modules }) {
    return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { bold: true, children: "Modules" }), modules.map((m) => (_jsxs(Box, { flexDirection: "column", marginBottom: m.errorMessage ? 1 : 0, children: [_jsxs(Box, { gap: 2, children: [_jsxs(Text, { color: statusColor[m.status] ?? 'white', children: ["[", statusLabel[m.status] ?? m.status, "]"] }), _jsx(Text, { children: m.name ?? m.moduleId }), m.status !== 'pending' && _jsx(Text, { color: "yellow", children: formatElapsed(m.elapsedMs) }), m.findings.length > 0 && (_jsxs(Text, { color: "cyan", children: ["+", m.findings.length, " findings"] }))] }), m.status === 'running' && MODULE_DESCRIPTIONS[m.moduleId] && (_jsxs(Text, { dimColor: true, children: ["\u00B7 ", MODULE_DESCRIPTIONS[m.moduleId]] })), m.errorMessage && (_jsx(Text, { color: "red", dimColor: true, children: m.errorMessage }))] }, m.moduleId)))] }));
}
//# sourceMappingURL=module-progress.js.map