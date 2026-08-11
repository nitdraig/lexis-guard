import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, Spinner } from '@inkjs/ui';
import { AuditLog } from '../../core/audit-log.js';
import { FindingsPanel } from '../components/findings-panel.js';
export function HistoryView({ onBack, onLoadSession }) {
    const [sessions, setSessions] = useState(null);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        setSessions(new AuditLog().listSessions().slice(0, 15));
    }, []);
    // lexis: Esc backtracks (detail -> list -> menu) as a single-key navigation
    useInput((_input, key) => {
        if (!key.escape)
            return;
        if (selected)
            setSelected(null);
        else
            onBack();
    });
    if (selected) {
        const { meta, findings } = selected;
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Session \u2014 ", new Date(meta.timestamp).toLocaleString()] }), _jsxs(Box, { gap: 2, children: [_jsxs(Text, { children: ["Target: ", _jsx(Text, { color: "cyan", children: meta.target })] }), _jsxs(Text, { children: ["Mode: ", _jsx(Text, { color: meta.mode === 'aggressive' ? 'red' : 'green', children: meta.mode })] }), _jsxs(Text, { children: ["Duration: ", _jsxs(Text, { color: "yellow", children: [(meta.durationMs / 1000).toFixed(1), "s"] })] }), meta.incomplete && _jsx(Text, { color: "redBright", children: "[INCOMPLETE]" })] }), _jsx(FindingsPanel, { findings: findings }), _jsx(Box, { marginTop: 1, children: _jsx(Select, { options: [
                            { label: 'Use these results (AI / Export)', value: 'use' },
                            { label: '← Back to list', value: 'back' }
                        ], onChange: (value) => {
                            if (value === 'use')
                                onLoadSession(selected);
                            else
                                setSelected(null);
                        } }) }), _jsx(Text, { dimColor: true, children: "Press Esc to go back." })] }));
    }
    const options = (sessions ?? []).map((s, i) => ({
        label: `${new Date(s.meta.timestamp).toLocaleString()} — ${s.meta.target} (${s.findings.length} findings)${s.meta.incomplete ? ' [incomplete]' : ''}`,
        value: String(i)
    }));
    return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Audit history \u2014 saved sessions" }), sessions === null ? (_jsx(Spinner, { label: "Reading history..." })) : sessions.length === 0 ? (_jsx(Text, { dimColor: true, children: "No saved sessions yet. Complete an audit to store one." })) : (_jsx(Select, { options: [...options, { label: '← Back', value: 'back' }], visibleOptionCount: 8, onChange: (value) => {
                    if (value === 'back')
                        onBack();
                    else
                        setSelected(sessions[Number(value)]);
                } }))] }));
}
//# sourceMappingURL=history.js.map