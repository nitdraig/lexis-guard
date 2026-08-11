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

interface ModuleProgressProps {
  modules: OrchestratorProgress[];
}

export function ModuleProgress({ modules }: ModuleProgressProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>Modules</Text>
      {modules.map((m) => (
        <Box key={m.moduleId} gap={2}>
          <Text color={statusColor[m.status] ?? 'white'}>
            [{statusLabel[m.status] ?? m.status}]
          </Text>
          <Text>{m.moduleId}</Text>
          {m.findings.length > 0 && (
            <Text color="cyan">+{m.findings.length} findings</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
