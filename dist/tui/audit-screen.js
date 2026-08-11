import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBar } from './components/status-bar.js';
import { ModuleProgress } from './components/module-progress.js';
import { FindingsPanel } from './components/findings-panel.js';
import { ThrottleIndicator } from './components/throttle-indicator.js';
import { runAudit } from './orchestrator.js';
import { HttpEngine } from '../core/http-engine.js';
import { SecurityModule } from '../modules/security-module.js';
import { PerformanceModule } from '../modules/performance-module.js';
import { ScalabilityModule } from '../modules/scalability-module.js';
const INITIAL_MODULES = [
    { moduleId: 'security', name: 'Security', status: 'pending', findings: [] },
    { moduleId: 'performance', name: 'Performance', status: 'pending', findings: [] },
    { moduleId: 'scalability', name: 'Scalability', status: 'pending', findings: [] }
];
export function AuditScreen({ target, config, onComplete, onExit }) {
    const [phase, setPhase] = useState('connecting');
    const [modules, setModules] = useState(INITIAL_MODULES);
    const [findings, setFindings] = useState([]);
    const [throttleState, setThrottleState] = useState('normal');
    const [durationMs, setDurationMs] = useState(0);
    const [requests, setRequests] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);
    const completedRef = useRef(false);
    const startedAtRef = useRef(null);
    const engineRef = useRef(null);
    useInput((_input, key) => {
        if (key.escape)
            onExit?.();
    });
    // Live telemetry ticker: elapsed time + executed requests while the audit runs.
    useEffect(() => {
        if (phase !== 'running')
            return;
        const startedAt = startedAtRef.current ?? Date.now();
        startedAtRef.current = startedAt;
        const timer = setInterval(() => {
            setDurationMs(Date.now() - startedAt);
            setRequests(engineRef.current?.getRequestCount() ?? 0);
        }, 250);
        return () => clearInterval(timer);
    }, [phase]);
    useEffect(() => {
        let cancelled = false;
        const engine = new HttpEngine({
            baseUrl: target,
            concurrency: config.limits.max_concurrent_requests,
            latencyThresholdMs: 1000,
            abortOnDegradationPct: config.limits.abort_on_latency_degradation_pct
        });
        engineRef.current = engine;
        async function execute() {
            try {
                const health = await engine.fetch('/', 'GET');
                if (health.statusCode >= 500) {
                    if (!cancelled)
                        setErrorMsg(`Target returned ${health.statusCode} on health check`);
                    return;
                }
            }
            catch (err) {
                if (!cancelled)
                    setErrorMsg(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
                return;
            }
            if (cancelled)
                return;
            startedAtRef.current = Date.now();
            setPhase('running');
            const auditModules = [new SecurityModule(), new PerformanceModule(), new ScalabilityModule()];
            await runAudit(auditModules, target, config, engine, {
                onFinding: (finding) => {
                    if (!cancelled)
                        setFindings((prev) => [...prev, finding]);
                },
                onProgress: (progress) => {
                    if (cancelled)
                        return;
                    setModules((prev) => prev.map((m) => (m.moduleId === progress.moduleId ? progress : m)));
                },
                onThrottleState: (state) => {
                    if (!cancelled)
                        setThrottleState(state);
                },
                onComplete: (allFindings, duration) => {
                    if (cancelled)
                        return;
                    setDurationMs(duration);
                    setRequests(engine.getRequestCount());
                    setPhase('done');
                    if (!completedRef.current) {
                        completedRef.current = true;
                        onComplete?.(allFindings, duration);
                    }
                    engine.close().catch(() => { });
                },
                onError: (err) => {
                    if (!cancelled)
                        setErrorMsg(err.message);
                    engine.close().catch(() => { });
                }
            });
        }
        execute();
        return () => {
            cancelled = true;
            engine.close().catch(() => { });
        };
    }, [target, config]);
    if (errorMsg) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Text, { bold: true, color: "red", children: "LexisGuard \u2014 Error" }), _jsx(Text, { color: "red", children: errorMsg }), _jsx(Text, { dimColor: true, children: "Press Esc to return" })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(StatusBar, { target: target, mode: config.mode, durationMs: durationMs, incomplete: throttleState === 'abort', requests: requests }), _jsx(ThrottleIndicator, { state: throttleState }), _jsx(ModuleProgress, { modules: modules }), _jsx(FindingsPanel, { findings: findings }), phase === 'done' && (_jsx(Box, { marginTop: 1, children: _jsxs(Text, { bold: true, color: "green", children: ["Audit complete \u2014 ", findings.length, " findings. Press Esc for the menu."] }) })), phase === 'connecting' && (_jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "yellow", children: "Connecting to target..." }) })), phase === 'running' && (_jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "Press Esc to abort and return to the menu." }) }))] }));
}
//# sourceMappingURL=audit-screen.js.map