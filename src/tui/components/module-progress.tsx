import React from 'react';
import { Box, Text } from 'ink';
import type { OrchestratorProgress } from '../orchestrator.js';

const statusColor: Record<string, string> = {
  pending: 'gray',
  running: 'yellow',
  done: 'green',
  error: 'red'
};

const statusLabel: Record<string, string> = {
  pending: '...',
  running: 'RUNNING',
  done: 'DONE',
  error: 'ERROR'
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  security: 'OWASP checks: headers, CORS, sensitive files, JWT cookies, BOLA/BFLA cross-auth',
  performance: 'Latency, TTFB, payload compression, HTTP/2 support',
  scalability: 'Rate-limit burst (10 req), soak load, circuit breaker state'
};

function formatElapsed(ms: number | undefined): string {
  if (ms === undefined) return '';
  return ` ${(ms / 1000).toFixed(1)}s`;
}

interface ModuleProgressProps {
  modules: OrchestratorProgress[];
}

export function ModuleProgress({ modules }: ModuleProgressProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>Modules</Text>
      {modules.map((m) => (
        <Box key={m.moduleId} flexDirection="column" marginBottom={m.errorMessage ? 1 : 0}>
          <Box gap={2}>
            <Text color={statusColor[m.status] ?? 'white'}>
              [{statusLabel[m.status] ?? m.status}]
            </Text>
            <Text>{m.name ?? m.moduleId}</Text>
            {m.status !== 'pending' && <Text color="yellow">{formatElapsed(m.elapsedMs)}</Text>}
            {m.findings.length > 0 && (
              <Text color="cyan">+{m.findings.length} findings</Text>
            )}
          </Box>
          {m.status === 'running' && MODULE_DESCRIPTIONS[m.moduleId] && (
            <Text dimColor>· {MODULE_DESCRIPTIONS[m.moduleId]}</Text>
          )}
          {m.errorMessage && (
            <Text color="red" dimColor>{m.errorMessage}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
