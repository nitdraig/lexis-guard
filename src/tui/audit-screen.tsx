import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select } from '@inkjs/ui';
import { StatusBar } from './components/status-bar.js';
import { ModuleProgress } from './components/module-progress.js';
import { FindingsPanel } from './components/findings-panel.js';
import { ThrottleIndicator } from './components/throttle-indicator.js';
import { runAudit, type OrchestratorProgress } from './orchestrator.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import { HttpEngine } from '../core/http-engine.js';
import { defaultPluginRegistry } from '../plugins/registry.js';
import { EscalationGate } from '../core/escalation-gate.js';
import type { AuditPlugin } from '../plugins/plugin-types.js';

interface AuditScreenProps {
  target: string;
  config: Lexisrc;
  /** Called once with final findings + duration when the audit finishes. */
  onComplete?: (findings: Finding[], durationMs: number) => void;
  /** Called when the user presses Esc (return to menu). */
  onExit?: () => void;
}

function resolveModules(config: Lexisrc): AuditPlugin[] {
  return defaultPluginRegistry().resolve(
    config.plugins.enabled,
    config.plugins.disabled
  );
}

type Escalation = 'idle' | 'allow' | 'skip';

export function AuditScreen({ target, config, onComplete, onExit }: AuditScreenProps): React.ReactElement {
  const [phase, setPhase] = useState<'connecting' | 'running' | 'done' | 'error'>('connecting');
  const [modules, setModules] = useState<OrchestratorProgress[]>(() =>
    resolveModules(config).map((m) => ({
      moduleId: m.id,
      name: m.name,
      status: 'pending',
      findings: []
    }))
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [throttleState, setThrottleState] = useState('normal');
  const [durationMs, setDurationMs] = useState(0);
  const [requests, setRequests] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [escalation, setEscalation] = useState<Escalation>('idle');
  const completedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const engineRef = useRef<HttpEngine | null>(null);

  const auditModules = resolveModules(config);
  const gatedModules = auditModules.filter((m) => m.requiresEscalation);
  const needsEscalationPrompt = gatedModules.length > 0;

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
    // With gated modules present, wait for the explicit escalation decision.
    if (needsEscalationPrompt && escalation === 'idle') return;

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

      const escalationGate = new EscalationGate(escalation === 'allow');

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
      }, escalationGate);
    }

    execute();

    return () => {
      cancelled = true;
      engine.close().catch(() => {});
    };
  }, [target, config, escalation, needsEscalationPrompt]);

  if (errorMsg) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">LexisGuard — Error</Text>
        <Text color="red">{errorMsg}</Text>
        <Text dimColor>Press Esc to return</Text>
      </Box>
    );
  }

  if (needsEscalationPrompt && escalation === 'idle' && phase === 'connecting') {
    const names = gatedModules.map((m) => m.name).join(', ');
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="yellow">Active exploitation modules</Text>
        <Text>
          This audit includes modules that send mutating or potentially destructive payloads:{' '}
          <Text color="red">{names}</Text>
        </Text>
        <Text dimColor>Choose how to proceed before the audit starts.</Text>
        <Select
          options={[
            { label: `Run active exploitation modules (${names})`, value: 'allow' },
            { label: 'Skip active exploitation modules (safe)', value: 'skip' }
          ]}
          onChange={(value) => setEscalation(value as 'allow' | 'skip')}
        />
        <Text dimColor>Esc to go back</Text>
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
