import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export function StatusBar({ target, mode, durationMs, incomplete, requests }) {
    return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { bold: true, underline: true, children: "LexisGuard Audit" }), _jsxs(Box, { gap: 2, children: [_jsxs(Text, { children: ["Target: ", _jsx(Text, { color: "cyan", children: target })] }), _jsxs(Text, { children: ["Mode: ", _jsx(Text, { color: mode === 'aggressive' ? 'red' : 'green', children: mode })] }), _jsxs(Text, { children: ["Duration: ", _jsxs(Text, { color: "yellow", children: [(durationMs / 1000).toFixed(1), "s"] })] }), requests !== undefined && _jsxs(Text, { children: ["Requests: ", _jsx(Text, { color: "magenta", children: requests })] }), incomplete && _jsx(Text, { color: "redBright", children: "[INCOMPLETE]" })] })] }));
}
//# sourceMappingURL=status-bar.js.map