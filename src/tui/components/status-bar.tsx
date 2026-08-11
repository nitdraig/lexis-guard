import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  target: string;
  mode: string;
  durationMs: number;
  incomplete: boolean;
  requests?: number;
}

export function StatusBar({ target, mode, durationMs, incomplete, requests }: StatusBarProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold underline>
        LexisGuard Audit
      </Text>
      <Box gap={2}>
        <Text>Target: <Text color="cyan">{target}</Text></Text>
        <Text>Mode: <Text color={mode === 'aggressive' ? 'red' : 'green'}>{mode}</Text></Text>
        <Text>Duration: <Text color="yellow">{(durationMs / 1000).toFixed(1)}s</Text></Text>
        {requests !== undefined && <Text>Requests: <Text color="magenta">{requests}</Text></Text>}
        {incomplete && <Text color="redBright">[INCOMPLETE]</Text>}
      </Box>
    </Box>
  );
}
