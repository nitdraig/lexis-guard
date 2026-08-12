import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBar } from './components/status-bar.js';
import { ModuleProgress } from './components/module-progress.js';
import { FindingsPanel } from './components/findings-panel.js';
import { ThrottleIndicator } from './components/throttle-indicator.js';
import { runAudit, type OrchestratorProgress } from './orchestrator.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import { HttpEngine } from '../core/http-engine.js';
import { SecurityModule } from '../modules/security-module.js';
import { PerformanceModule } from '../modules/performance-module.js';
import { ScalabilityModule } from '../modules/scalability-module.js';

interface AuditScreenProps {
  target: string;
  config: Lexisrc;
  /** Called once with final findings + duration when the audit finishes. */
  onComplete?: (findings: Finding[], durationMs: number) => void;
  /** Called when the user presses Esc (return to menu). */
  onExit?: () => void;
}

const INITIAL_MODULES: OrchestratorProgress[] = [
  { moduleId: 'security', name: 'Security', status: 'pending', findings: [] },
  { moduleId: 'performance', name: 'Performance', status: 'pending', findings: [] },
  { moduleId: 'scalability', name: 'Scalability', status: 'pending', findings: [] }
];

export function AuditScreen({ target, config, onComplete, onExit }: AuditScreenProps): React.ReactElement {
  const [phase, setPhase] = useState<'connecting' | 'running' | 'done' | 'error'>('connecting');
  const [modules, setModules] = useState<OrchestratorProgress[]>(INITIAL_MODULES);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [throttleState, setThrottleState] = useState('normal');
  const [durationMs, setDurationMs] = useState(0);
  const [requests, setRequests] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const completedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const engineRef = useRef<HttpEngine | null>(null);

  useInput((_input, key) => {
    if (key.escape) onExit?.();
  });

  // Live telemetry ticker: elapsed time + executed requests while the audit runs.
  useEffect(() => {
    if (phase !== 'running') return;
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
      abortOnDegradationPct: config.limits.abort_on_latency_degradation_pct,
      maxRequests: config.limits.max_requests_per_test
    });
    engineRef.current = engine;

    async function execute(): Promise<void> {
      try {
        const health = await engine.fetch('/', 'GET');
        if (health.statusCode >= 500) {
          if (!cancelled) setErrorMsg(`Target returned ${health.statusCode} on health check`);
          return;
        }
      } catch (err) {
        if (!cancelled) setErrorMsg(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      if (cancelled) return;
      startedAtRef.current = Date.now();
      setPhase('running');

      const auditModules = [new SecurityModule(), new PerformanceModule(), new ScalabilityModule()];

      await runAudit(auditModules, target, config, engine, {
        onFinding: (finding) => {
          if (!cancelled) setFindings((prev) => [...prev, finding]);
        },
        onProgress: (progress) => {
          if (cancelled) return;
          setModules((prev) =>
            prev.map((m) => (m.moduleId === progress.moduleId ? progress : m))
          );
        },
        onThrottleState: (state) => {
          if (!cancelled) setThrottleState(state);
        },
        onComplete: (allFindings, duration) => {
          if (cancelled) return;
          setDurationMs(duration);
          setRequests(engine.getRequestCount());
          setPhase('done');
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.(allFindings, duration);
          }
          engine.close().catch(() => {});
        },
        onError: (err) => {
          if (!cancelled) setErrorMsg(err.message);
          engine.close().catch(() => {});
        }
      });
    }

    execute();

    return () => {
      cancelled = true;
      engine.close().catch(() => {});
    };
  }, [target, config]);

  if (errorMsg) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">LexisGuard — Error</Text>
        <Text color="red">{errorMsg}</Text>
        <Text dimColor>Press Esc to return</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <StatusBar
        target={target}
        mode={config.mode}
        durationMs={durationMs}
        incomplete={throttleState === 'abort'}
        requests={requests}
      />
      <ThrottleIndicator state={throttleState} />
      <ModuleProgress modules={modules} />
      <FindingsPanel findings={findings} />
      {phase === 'done' && (
        <Box marginTop={1}>
          <Text bold color="green">
            Audit complete — {findings.length} findings. Press Esc for the menu.
          </Text>
        </Box>
      )}
      {phase === 'connecting' && (
        <Box marginTop={1}>
          <Text color="yellow">Connecting to target...</Text>
        </Box>
      )}
      {phase === 'running' && (
        <Box marginTop={1}>
          <Text dimColor>Press Esc to abort and return to the menu.</Text>
        </Box>
      )}
    </Box>
  );
}