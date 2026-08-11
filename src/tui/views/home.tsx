import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import cfonts from 'cfonts';
import type { ViewId } from '../session.js';

interface HomeViewProps {
  targetCount: number;
  mode: string;
  provider: string;
  environment: string;
  hasFindings: boolean;
  onNavigate: (view: ViewId) => void;
  onQuit: () => void;
}

const MENU_OPTIONS: { value: ViewId | 'quit'; label: string }[] = [
  { value: 'audit', label: 'Audit' },
  { value: 'config', label: 'Configuration' },
  { value: 'history', label: 'History' },
  { value: 'ai', label: 'Consult AI' },
  { value: 'export', label: 'Export results' },
  { value: 'quit', label: 'Quit' }
];

// Render once at module load — static banner, no per-render cost.
const rendered = cfonts.render('LexisGuard', {
  font: '3d',
  colors: ['cyan'],
  background: 'transparent',
  align: 'left',
  space: true
});
const BANNER = rendered === false ? 'LexisGuard' : rendered.string;

export function HomeView({
  targetCount,
  mode,
  provider,
  environment,
  hasFindings,
  onNavigate,
  onQuit
}: HomeViewProps): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      <Text>{BANNER}</Text>
      <Text dimColor>Automated API security, performance and scalability auditing workbench.</Text>
      <Text dimColor>
        Targets: {targetCount} · Mode: {mode} · Environment: {environment} · AI: {provider}
        {hasFindings ? ' · Results ready' : ''}
      </Text>
      <Box marginTop={1} flexDirection="column" gap={1}>
        <Select
          options={MENU_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          onChange={(value) => {
            const v = value as ViewId | 'quit';
            if (v === 'quit') onQuit();
            else onNavigate(v);
          }}
        />
      </Box>
      <Text dimColor>Use arrow keys and Enter to navigate. Ctrl+C to quit.</Text>
    </Box>
  );
}