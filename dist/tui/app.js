import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text } from 'ink';
import { HomeView } from './views/home.js';
import { AuditView } from './views/audit.js';
import { ConfigView } from './views/config.js';
import { HistoryView } from './views/history.js';
import { AiView } from './views/ai.js';
import { ExportView } from './views/export.js';
import { defaultRawLexisrc } from '../config/default.js';
import { Sanitizer } from '../core/sanitizer.js';
import { AuditLog } from '../core/audit-log.js';
export function App({ initialRawConfig, initialConfigPath, initialTarget, onQuit }) {
    const [rawConfig, setRawConfig] = useState(initialRawConfig ?? defaultRawLexisrc());
    const [configPath, setConfigPath] = useState(initialConfigPath ?? null);
    const [view, setView] = useState(initialTarget ? 'audit' : 'home');
    const [findings, setFindings] = useState(null);
    const [meta, setMeta] = useState(null);
    const [auditRunId, setAuditRunId] = useState(0);
    const session = { rawConfig, configPath, findings, meta };
    function storeFindings(target, deduped, durationMs) {
        // lexis: raw config only (no env interpolation) so results survive even if tokens are unset
        const sanitizer = new Sanitizer(rawConfig.scope.allowed_targets);
        const sanitized = deduped.map((f) => sanitizer.sanitizeFinding(f));
        const auditMeta = {
            target,
            mode: rawConfig.mode,
            timestamp: new Date().toISOString(),
            durationMs,
            incomplete: false
        };
        setFindings(sanitized);
        setMeta(auditMeta);
        setAuditRunId((n) => n + 1);
        new AuditLog().write({
            timestamp: auditMeta.timestamp,
            target,
            mode: rawConfig.mode,
            checks: ['security', 'performance', 'scalability'],
            findings_count: sanitized.length,
            incomplete: false
        });
        new AuditLog().saveSession(auditMeta, sanitized);
        // lexis: stay on the results screen so the user sees the final state
        // and can decide when to go back to the menu (Esc).
    }
    function restoreSession(session) {
        setFindings(session.findings);
        setMeta(session.meta);
        setAuditRunId((n) => n + 1);
        setView('home');
    }
    return (_jsxs(Box, { flexDirection: "column", children: [view === 'home' && (_jsx(HomeView, { targetCount: rawConfig.scope.allowed_targets.length, mode: rawConfig.mode, provider: rawConfig.ai.provider, environment: rawConfig.scope.environment, hasFindings: findings !== null && findings.length > 0, onNavigate: (v) => setView(v), onQuit: () => onQuit?.() })), view === 'audit' && (_jsx(AuditView, { session: session, onStoreFindings: storeFindings, onAddTarget: (hostname) => setRawConfig((r) => ({
                    ...r,
                    scope: { ...r.scope, allowed_targets: [...new Set([...r.scope.allowed_targets, hostname])] }
                })), onBack: () => setView('home') })), view === 'config' && (_jsx(ConfigView, { session: session, onUpdateRaw: setRawConfig, onUpdatePath: setConfigPath, onBack: () => setView('home') })), view === 'history' && (_jsx(HistoryView, { onBack: () => setView('home'), onLoadSession: restoreSession })), view === 'ai' && _jsx(AiView, { session: session, onBack: () => setView('home') }), view === 'export' && _jsx(ExportView, { session: session, onBack: () => setView('home') }), auditRunId > 0 && (_jsx(Text, { dimColor: true, children: "Audit saved to history. Results are ready for AI consultation / Export." }))] }));
}
//# sourceMappingURL=app.js.map