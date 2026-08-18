import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, Spinner } from '@inkjs/ui';
import { AuditLog, type SavedSession } from '../../core/audit-log.js';
import { computeSessionTrend } from '../../core/trending.js';
import { compareSessions } from '../../core/regression.js';
import { FindingsPanel } from '../components/findings-panel.js';

interface HistoryViewProps {
  onBack: () => void;
  /** Restores a saved session into the workbench (findings + meta ready for AI / Export). */
  onLoadSession: (session: SavedSession) => void;
}

export function HistoryView({ onBack, onLoadSession }: HistoryViewProps): React.ReactElement {
  const [sessions, setSessions] = useState<SavedSession[] | null>(null);
  const [selected, setSelected] = useState<SavedSession | null>(null);

  useEffect(() => {
    setSessions(new AuditLog().listSessions().slice(0, 15));
  }, []);

  // lexis: Esc backtracks (detail -> list -> menu) as a single-key navigation
  useInput((_input, key) => {
    if (!key.escape) return;
    if (selected) setSelected(null);
    else onBack();
  });

  if (selected) {
    const { meta, findings } = selected;
    const previous = (sessions ?? []).find((s) => s.meta.target === meta.target && s !== selected) ?? null;
    const trend = computeSessionTrend(
      { timestamp: meta.timestamp, findingsCount: findings.length },
      previous ? { timestamp: previous.meta.timestamp, findingsCount: previous.findings.length } : null
    );
    const sign = trend.delta > 0 ? '+' : '';
    const regression = compareSessions(previous, selected.findings);
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">
          Session — {new Date(meta.timestamp).toLocaleString()}
        </Text>
        <Box gap={2}>
          <Text>
            Target: <Text color="cyan">{meta.target}</Text>
          </Text>
          <Text>
            Mode: <Text color={meta.mode === 'aggressive' ? 'red' : 'green'}>{meta.mode}</Text>
          </Text>
          <Text>
            Duration: <Text color="yellow">{(meta.durationMs / 1000).toFixed(1)}s</Text>
          </Text>
          {meta.incomplete && <Text color="redBright">[INCOMPLETE]</Text>}
        </Box>
        <Box>
          <Text>
            Trend:{' '}
            {trend.previousRunAt ? (
              <Text color={trend.delta > 0 ? 'red' : trend.delta < 0 ? 'green' : 'yellow'}>
                {trend.previousCount} → {trend.currentCount} findings ({sign}{trend.delta})
              </Text>
            ) : (
              <Text dimColor>no previous run for this target</Text>
            )}
          </Text>
        </Box>
        {previous && (
          <Box>
            <Text>
              Regression:{' '}
              <Text color="green">resolved {regression.resolved.length}</Text>{' · '}
              <Text color="red">new {regression.new.length}</Text>{' · '}
              <Text color="yellow">persistent {regression.persistent.length}</Text>
            </Text>
          </Box>
        )}
        <FindingsPanel findings={findings} />
        <Box marginTop={1}>
          <Select
            options={[
              { label: 'Use these results (AI / Export)', value: 'use' },
              { label: '← Back to list', value: 'back' }
            ]}
            onChange={(value) => {
              if (value === 'use') onLoadSession(selected);
              else setSelected(null);
            }}
          />
        </Box>
        <Text dimColor>Press Esc to go back.</Text>
      </Box>
    );
  }

  const options = (sessions ?? []).map((s, i) => ({
    label: `${new Date(s.meta.timestamp).toLocaleString()} — ${s.meta.target} (${s.findings.length} findings)${s.meta.incomplete ? ' [incomplete]' : ''}`,
    value: String(i)
  }));

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color="cyan">
        Audit history — saved sessions
      </Text>
      {sessions === null ? (
        <Spinner label="Reading history..." />
      ) : sessions.length === 0 ? (
        <Text dimColor>No saved sessions yet. Complete an audit to store one.</Text>
      ) : (
        <Select
          options={[...options, { label: '← Back', value: 'back' }]}
          visibleOptionCount={8}
          onChange={(value) => {
            if (value === 'back') onBack();
            else setSelected(sessions[Number(value)]);
          }}
        />
      )}
    </Box>
  );
}