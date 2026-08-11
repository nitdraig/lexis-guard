import React from 'react';
import { Box, Text } from 'ink';
import type { Finding } from '../../types/finding.js';

const severityColor: Record<string, string> = {
  info: 'gray',
  low: 'green',
  medium: 'yellow',
  high: 'red',
  critical: 'redBright'
};

interface FindingsPanelProps {
  findings: Finding[];
  maxDisplay?: number;
}

export function FindingsPanel({ findings, maxDisplay = 20 }: FindingsPanelProps): React.ReactElement {
  const bySeverity: Record<string, number> = {};
  for (const f of findings) {
    const key = f.severity;
    bySeverity[key] = (bySeverity[key] ?? 0) + 1;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>Findings ({findings.length})</Text>
      <Box gap={2}>
        {Object.entries(bySeverity).map(([sev, count]) => (
          <Text key={sev} color={severityColor[sev] ?? 'white'}>
            {sev}: {count}
          </Text>
        ))}
      </Box>
      {findings.slice(0, maxDisplay).map((f, i) => (
        <Box key={i} gap={1}>
          <Text color={severityColor[f.severity] ?? 'white'}>
            [{f.severity.toUpperCase()}]
          </Text>
          <Text dimColor>{f.rule_id}</Text>
          <Text>{f.path}</Text>
        </Box>
      ))}
      {findings.length > maxDisplay && (
        <Text dimColor>...and {findings.length - maxDisplay} more</Text>
      )}
    </Box>
  );
}
