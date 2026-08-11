import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Select, TextInput, StatusMessage } from '@inkjs/ui';
import { AuditScreen } from '../audit-screen.js';
import { deduplicate } from '../../core/deduplicator.js';
import { Sanitizer } from '../../core/sanitizer.js';
import { parseLexisrc } from '../../config/lexisrc-parser.js';
import { isValidTarget, targetHostname } from './config.js';
import type { Lexisrc } from '../../config/lexisrc-schema.js';
import type { TuiSession } from '../session.js';

interface AuditViewProps {
  session: TuiSession;
  onStoreFindings: (target: string, findings: ReturnType<typeof deduplicate>, durationMs: number) => void;
  onAddTarget: (hostname: string) => void;
  onBack: () => void;
}

export function AuditView({ session, onStoreFindings, onAddTarget, onBack }: AuditViewProps): React.ReactElement {
  const targets = session.rawConfig.scope.allowed_targets;
  const [target, setTarget] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (targets.length === 0) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="yellow">No targets configured</Text>
        <Text>Add a URL under Configuration before auditing.</Text>
        <Select
          options={[{ label: 'Back', value: 'back' }]}
          onChange={onBack}
        />
      </Box>
    );
  }

  if (custom) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">Audit — new URL</Text>
        <TextInput
          placeholder="https://api.miempresa.com"
          onSubmit={(value) => {
            const input = value.trim();
            if (!input || !isValidTarget(input)) {
              setMessage({ ok: false, text: 'Invalid URL. Use a domain or an https URL.' });
              return;
            }
            const hostname = targetHostname(input);
            if (!targets.includes(hostname)) {
              onAddTarget(hostname);
              setMessage({ ok: true, text: `Target '${hostname}' added to the session.` });
            }
            setTarget(hostname);
            setCustom(false);
          }}
        />
        {message && (
          <Box>
            {message.ok ? (
              <StatusMessage variant="success">{message.text}</StatusMessage>
            ) : (
              <StatusMessage variant="error">{message.text}</StatusMessage>
            )}
          </Box>
        )}
        <Text dimColor>Esc to go back</Text>
      </Box>
    );
  }

  if (!target) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">Audit — choose target</Text>
        <Select
          options={[
            ...targets.map((t) => ({ label: t, value: t })),
            { label: 'Enter a new URL...', value: '__custom__' },
            { label: '← Back', value: '__back__' }
          ]}
          onChange={(value) => {
            if (value === '__custom__') setCustom(true);
            else if (value === '__back__') onBack();
            else setTarget(value);
          }}
        />
      </Box>
    );
  }

  // Config must be resolvable (env vars set) to run the audit.
  const resolved = resolveSessionConfig(session);

  if (!resolved) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="red">Invalid configuration for auditing</Text>
        <Text dimColor>Check tokens/environment under Configuration.</Text>
        <Select options={[{ label: 'Back', value: 'back' }]} onChange={onBack} />
      </Box>
    );
  }

  return (
    <AuditScreen
      target={target}
      config={resolved.config}
      onComplete={(findings, durationMs) => {
        const sanitizer = new Sanitizer(resolved.config.scope.allowed_targets);
        const deduped = deduplicate(findings).map((f) => sanitizer.sanitizeFinding(f));
        onStoreFindings(target, deduped, durationMs);
      }}
      onExit={onBack}
    />
  );
}

function resolveSessionConfig(session: TuiSession): { config: Lexisrc } | null {
  const result = parseLexisrc(session.rawConfig);
  if (!result.ok) return null;
  return { config: result.data };
}