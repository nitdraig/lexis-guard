import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
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

interface AppProps {
  target: string;
  config: Lexisrc;
}

export function AuditApp({ target, config }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [modules, setModules] = useState<OrchestratorProgress[]>([
    { moduleId: 'security', status: 'pending', findings: [] },
    { moduleId: 'performance', status: 'pending', findings: [] },
    { moduleId: 'scalability', status: 'pending', findings: [] }
  ]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [throttleState, setThrottleState] = useState('normal');
  const [done, setDone] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const engine = new HttpEngine({
    baseUrl: target,
    concurrency: config.limits.max_concurrent_requests,
    latencyThresholdMs: 1000,
    abortOnDegradationPct: config.limits.abort_on_latency_degradation_pct
  });

  const run = useCallback(async () => {
    const auditModules = [new SecurityModule(), new PerformanceModule(), new ScalabilityModule()];

    await runAudit(auditModules, target, config, engine, {
      onProgress: (progress) => {
        setModules((prev) =>
          prev.map((m) => (m.moduleId === progress.moduleId ? progress : m))
        );
        if (progress.findings.length > 0) {
          setFindings((prev) => [...prev, ...progress.findings]);
        }
      },
      onThrottleState: (state) => setThrottleState(state),
      onComplete: (_allFindings, duration) => {
        setDurationMs(duration);
        setDone(true);
        engine.close().catch(() => {});
      },
      onError: (err) => {
        setError(err.message);
        engine.close().catch(() => {});
      }
    });
  }, [target, config, engine]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (done || error) {
      const timer = setTimeout(() => exit(), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [done, error, exit]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
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
      />
      <ThrottleIndicator state={throttleState} />
      <ModuleProgress modules={modules} />
      <FindingsPanel findings={findings} />
      {done && (
        <Box marginTop={1}>
          <Text bold color="green">Audit complete. Exiting...</Text>
        </Box>
      )}
    </Box>
  );
}
