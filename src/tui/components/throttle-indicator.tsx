import React from 'react';
import { Box, Text } from 'ink';

const stateColor: Record<string, string> = {
  normal: 'green',
  throttle: 'yellow',
  abort: 'redBright'
};

interface ThrottleIndicatorProps {
  state: string;
}

export function ThrottleIndicator({ state }: ThrottleIndicatorProps): React.ReactElement {
  return (
    <Box marginBottom={1}>
      <Text>
        Throttle: <Text bold color={stateColor[state] ?? 'white'}>{state.toUpperCase()}</Text>
      </Text>
    </Box>
  );
}
