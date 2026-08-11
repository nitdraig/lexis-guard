import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
const stateColor = {
    normal: 'green',
    throttle: 'yellow',
    abort: 'redBright'
};
export function ThrottleIndicator({ state }) {
    return (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { children: ["Throttle: ", _jsx(Text, { bold: true, color: stateColor[state] ?? 'white', children: state.toUpperCase() })] }) }));
}
//# sourceMappingURL=throttle-indicator.js.map