import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import cfonts from 'cfonts';
const MENU_OPTIONS = [
    { value: 'audit', label: 'Audit' },
    { value: 'config', label: 'Configuration' },
    { value: 'history', label: 'History' },
    { value: 'ai', label: 'Consult AI' },
    { value: 'export', label: 'Export results' },
    { value: 'quit', label: 'Quit' }
];
// Render once at module load — static banner, no per-render cost.
const rendered = cfonts.render('LexisGuard', {
    font: '3d',
    colors: ['cyan'],
    background: 'transparent',
    align: 'left',
    space: true
});
const BANNER = rendered === false ? 'LexisGuard' : rendered.string;
export function HomeView({ targetCount, mode, provider, environment, hasFindings, onNavigate, onQuit }) {
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Text, { children: BANNER }), _jsx(Text, { dimColor: true, children: "Automated API security, performance and scalability auditing workbench." }), _jsxs(Text, { dimColor: true, children: ["Targets: ", targetCount, " \u00B7 Mode: ", mode, " \u00B7 Environment: ", environment, " \u00B7 AI: ", provider, hasFindings ? ' · Results ready' : ''] }), _jsx(Box, { marginTop: 1, flexDirection: "column", gap: 1, children: _jsx(Select, { options: MENU_OPTIONS.map((o) => ({ label: o.label, value: o.value })), onChange: (value) => {
                        const v = value;
                        if (v === 'quit')
                            onQuit();
                        else
                            onNavigate(v);
                    } }) }), _jsx(Text, { dimColor: true, children: "Use arrow keys and Enter to navigate. Ctrl+C to quit." })] }));
}
//# sourceMappingURL=home.js.map