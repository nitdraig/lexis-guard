import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text } from 'ink';
import { Select, TextInput, StatusMessage } from '@inkjs/ui';
import { AuditScreen } from '../audit-screen.js';
import { deduplicate } from '../../core/deduplicator.js';
import { Sanitizer } from '../../core/sanitizer.js';
import { parseLexisrc } from '../../config/lexisrc-parser.js';
import { isValidTarget, targetHostname } from './config.js';
export function AuditView({ session, onStoreFindings, onAddTarget, onBack }) {
    const targets = session.rawConfig.scope.allowed_targets;
    const [target, setTarget] = useState(null);
    const [custom, setCustom] = useState(false);
    const [message, setMessage] = useState(null);
    if (targets.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "yellow", children: "No targets configured" }), _jsx(Text, { children: "Add a URL under Configuration before auditing." }), _jsx(Select, { options: [{ label: 'Back', value: 'back' }], onChange: onBack })] }));
    }
    if (custom) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Audit \u2014 new URL" }), _jsx(TextInput, { placeholder: "https://api.miempresa.com", onSubmit: (value) => {
                        const input = value.trim();
                        if (!input || !isValidTarget(input)) {
                            setMessage({ ok: false, text: 'Invalid URL. Use a domain or an https URL.' });
                            return;
                        }
                        const hostname = targetHostname(input);
                        if (!targets.includes(hostname)) {
                            onAddTarget(hostname);
                            setMessage({ ok: true, text: `Target '${hostname}' added to the session.` });
                        }
                        setTarget(hostname);
                        setCustom(false);
                    } }), message && (_jsx(Box, { children: message.ok ? (_jsx(StatusMessage, { variant: "success", children: message.text })) : (_jsx(StatusMessage, { variant: "error", children: message.text })) })), _jsx(Text, { dimColor: true, children: "Esc to go back" })] }));
    }
    if (!target) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Audit \u2014 choose target" }), _jsx(Select, { options: [
                        ...targets.map((t) => ({ label: t, value: t })),
                        { label: 'Enter a new URL...', value: '__custom__' },
                        { label: '← Back', value: '__back__' }
                    ], onChange: (value) => {
                        if (value === '__custom__')
                            setCustom(true);
                        else if (value === '__back__')
                            onBack();
                        else
                            setTarget(value);
                    } })] }));
    }
    // Config must be resolvable (env vars set) to run the audit.
    const resolved = resolveSessionConfig(session);
    if (!resolved) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "red", children: "Invalid configuration for auditing" }), _jsx(Text, { dimColor: true, children: "Check tokens/environment under Configuration." }), _jsx(Select, { options: [{ label: 'Back', value: 'back' }], onChange: onBack })] }));
    }
    return (_jsx(AuditScreen, { target: target, config: resolved.config, onComplete: (findings, durationMs) => {
            const sanitizer = new Sanitizer(resolved.config.scope.allowed_targets);
            const deduped = deduplicate(findings).map((f) => sanitizer.sanitizeFinding(f));
            onStoreFindings(target, deduped, durationMs);
        }, onExit: onBack }));
}
function resolveSessionConfig(session) {
    const result = parseLexisrc(session.rawConfig);
    if (!result.ok)
        return null;
    return { config: result.data };
}
//# sourceMappingURL=audit.js.map