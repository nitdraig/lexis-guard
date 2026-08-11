import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, TextInput, StatusMessage, Spinner } from '@inkjs/ui';
import { writeFileSync } from 'node:fs';
import type { RawLexisrc } from '../../config/lexisrc-schema.js';
import { loadRawConfig } from '../../config/loader.js';
import { encryptSecret, isEncrypted } from '../../config/secret.js';
import { modelsForProvider, defaultModel, isLocalProvider } from '../../ai/models.js';
import type { LocalProviderName } from '../../ai/models.js';
import { listLocalModels } from '../../ai/local-models.js';
import type { TuiSession } from '../session.js';

type ConfigAction =
  | 'menu'
  | 'add_target'
  | 'remove_target'
  | 'mode'
  | 'provider'
  | 'model'
  | 'api_key'
  | 'save'
  | 'import'
  | 'export';

interface ConfigViewProps {
  session: TuiSession;
  onUpdateRaw: (raw: RawLexisrc) => void;
  onUpdatePath: (path: string | null) => void;
  onBack: () => void;
}

export function isValidTarget(input: string): boolean {
  let hostname = input;
  if (!/^https?:\/\//i.test(input)) hostname = `https://${input}`;
  try {
    const url = new URL(hostname);
    return url.hostname.includes('.') && url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function targetHostname(input: string): string {
  return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.toLowerCase();
}

export function ConfigView({ session, onUpdateRaw, onUpdatePath, onBack }: ConfigViewProps): React.ReactElement {
  const [action, setAction] = useState<ConfigAction>('menu');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useInput((_input, key) => {
    if (key.escape && action !== 'menu') setAction('menu');
  });

  const raw = session.rawConfig;
  const targets = raw.scope.allowed_targets;

  function apply(update: Partial<RawLexisrc>): void {
    onUpdateRaw({ ...raw, ...update });
  }

  switch (action) {
    case 'add_target': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Add target (domain, e.g. api.mycompany.com)</Text>
          <TextInput
            placeholder="https://api.miempresa.com"
            onSubmit={(value) => {
              if (!value.trim() || !isValidTarget(value.trim())) {
                setMessage({ ok: false, text: 'Invalid target. Use a domain or a valid https URL.' });
                setAction('menu');
                return;
              }
              const hostname = targetHostname(value);
              if (targets.includes(hostname)) {
                setMessage({ ok: false, text: `'${hostname}' is already in the list.` });
              } else {
                apply({ scope: { ...raw.scope, allowed_targets: [...targets, hostname] } });
                setMessage({ ok: true, text: `Target '${hostname}' added.` });
              }
              setAction('menu');
            }}
          />
          <Text dimColor>Esc to cancel</Text>
        </Box>
      );
    }

    case 'remove_target': {
      if (targets.length === 0) {
        setAction('menu');
        return <Box />;
      }
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Remove target</Text>
          <Select
            options={[
              ...targets.map((t) => ({ label: t, value: t })),
              { label: '← Cancel', value: '__cancel__' }
            ]}
            onChange={(value) => {
              if (value === '__cancel__') {
                setAction('menu');
                return;
              }
              apply({ scope: { ...raw.scope, allowed_targets: targets.filter((t) => t !== value) } });
              setMessage({ ok: true, text: `Target '${value}' removed.` });
              setAction('menu');
            }}
          />
        </Box>
      );
    }

    case 'mode': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Mode</Text>
          <Select
            options={[
              { label: 'safe', value: 'safe' },
              { label: 'aggressive', value: 'aggressive' },
              { label: '← Cancel', value: '__cancel__' }
            ]}
            onChange={(value) => {
              if (value === '__cancel__') {
                setAction('menu');
                return;
              }
              apply({ mode: value as 'safe' | 'aggressive' });
              setAction('menu');
            }}
          />
        </Box>
      );
    }

    case 'provider': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">AI provider</Text>
          <Select
            options={[
              { label: 'openai', value: 'openai' },
              { label: 'deepseek', value: 'deepseek' },
              { label: 'anthropic', value: 'anthropic' },
              { label: 'Ollama (local models)', value: 'ollama' },
              { label: 'LM Studio (local models)', value: 'lmstudio' },
              { label: 'More providers coming soon', value: '__soon__' },
              { label: '← Cancel', value: '__cancel__' }
            ]}
            onChange={(value) => {
              if (value === '__cancel__') {
                setAction('menu');
                return;
              }
              if (value === '__soon__') {
                setMessage({ ok: false, text: 'More providers coming soon.' });
                setAction('menu');
                return;
              }
              const provider = value as RawLexisrc['ai']['provider'];
              apply({ ai: { ...raw.ai, provider, model: defaultModel(provider) } });
              // lexis: local providers have no fixed catalog; force model selection
              if (isLocalProvider(provider)) setAction('model');
              else setAction('menu');
            }}
          />
        </Box>
      );
    }

    case 'model': {
      if (isLocalProvider(raw.ai.provider)) {
        return (
          <LocalModelPicker
            provider={raw.ai.provider}
            current={raw.ai.model ?? ''}
            onPick={(model) => {
              apply({ ai: { ...raw.ai, model } });
              setAction('menu');
            }}
            onCancel={() => setAction('menu')}
          />
        );
      }
      const models = modelsForProvider(raw.ai.provider);
      if (models.length === 0) {
        setAction('menu');
        return <Box />;
      }
      const current = raw.ai.model ?? defaultModel(raw.ai.provider);
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">
            Model — provider: {raw.ai.provider} (current: {current})
          </Text>
          <Select
            options={[
              ...models.map((m) => ({ label: `${m.tier} · ${m.id}`, value: m.id })),
              { label: '← Cancel', value: '__cancel__' }
            ]}
            onChange={(value) => {
              if (value === '__cancel__') {
                setAction('menu');
                return;
              }
              apply({ ai: { ...raw.ai, model: value } });
              setAction('menu');
            }}
          />
        </Box>
      );
    }

    case 'api_key': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">API key — provider: {raw.ai.provider}</Text>
          <Text dimColor>Stored encrypted (AES-256-GCM). Key material lives in ~/.lexisguard/.secret</Text>
          <TextInput
            placeholder="sk-..."
            onSubmit={(value) => {
              const key = value.trim();
              if (!key) {
                setMessage({ ok: false, text: 'Empty API key.' });
                setAction('menu');
                return;
              }
              apply({ ai: { ...raw.ai, api_key: encryptSecret(key) } });
              setMessage({ ok: true, text: 'API key encrypted and stored.' });
              setAction('menu');
            }}
          />
          <Text dimColor>Esc to cancel</Text>
        </Box>
      );
    }

    case 'save': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Save configuration</Text>
          <Text dimColor>Path (default: {session.configPath ?? '.lexisrc.json'})</Text>
          <TextInput
            defaultValue={session.configPath ?? '.lexisrc.json'}
            onSubmit={(value) => {
              // lexis: TUI edits are raw; validate with the raw schema before saving
              const validation = validateRawForSave(raw);
              if (!validation.ok) {
                setMessage({ ok: false, text: validation.error ?? 'Invalid configuration.' });
                setAction('menu');
                return;
              }
              const path = value.trim() || '.lexisrc.json';
              writeFileSync(path, JSON.stringify(raw, null, 2), 'utf-8');
              onUpdatePath(path);
              setMessage({ ok: true, text: `Configuration saved to ${path}` });
              setAction('menu');
            }}
          />
          <Text dimColor>Esc to cancel</Text>
        </Box>
      );
    }

    case 'import': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Import configuration (path)</Text>
          <TextInput
            placeholder=".lexisrc.json"
            onSubmit={(value) => {
              try {
                const imported = loadRawConfig(value.trim());
                onUpdateRaw(imported);
                onUpdatePath(value.trim());
                setMessage({ ok: true, text: `Configuration imported from ${value.trim()}` });
              } catch (err) {
                setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
              }
              setAction('menu');
            }}
          />
          <Text dimColor>Esc to cancel</Text>
        </Box>
      );
    }

    case 'export': {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Export configuration (path)</Text>
          <TextInput
            placeholder="./config-backup.json"
            onSubmit={(value) => {
              const path = value.trim();
              if (!path) {
                setMessage({ ok: false, text: 'Empty path.' });
                setAction('menu');
                return;
              }
              writeFileSync(path, JSON.stringify(raw, null, 2), 'utf-8');
              setMessage({ ok: true, text: `Configuration exported to ${path}` });
              setAction('menu');
            }}
          />
          <Text dimColor>Esc to cancel</Text>
        </Box>
      );
    }

    default: {
      return (
        <Box flexDirection="column" padding={1} gap={1}>
          <Text bold color="cyan">Configuration</Text>
          <Text dimColor>
            Targets ({targets.length}): {targets.join(', ') || '—'}
          </Text>
          <Text dimColor>
            Mode: {raw.mode} · AI: {raw.ai.provider} / {raw.ai.model ?? defaultModel(raw.ai.provider)} · API key:{' '}
            {isLocalProvider(raw.ai.provider)
              ? 'local (no key)'
              : isEncrypted(raw.ai.api_key ?? '')
                ? 'set (encrypted)'
                : 'not set'}{' '}
            · Saved at: {session.configPath ?? 'no file'}
          </Text>
          <Box marginTop={1}>
            <Select
              options={[
                { label: 'Add target', value: 'add_target' },
                { label: 'Remove target', value: 'remove_target' },
                { label: 'Change mode', value: 'mode' },
                { label: 'Change AI provider', value: 'provider' },
                { label: 'Change AI model', value: 'model' },
                { label: 'Set API key', value: 'api_key' },
                { label: 'Save configuration', value: 'save' },
                { label: 'Import from file', value: 'import' },
                { label: 'Export to file', value: 'export' },
                { label: '← Back', value: '__back__' }
              ]}
              onChange={(value) => {
                if (value === '__back__') onBack();
                else setAction(value as ConfigAction);
              }}
            />
          </Box>
          {message && (
            <Box marginTop={1}>
              {message.ok ? (
                <StatusMessage variant="success">{message.text}</StatusMessage>
              ) : (
                <StatusMessage variant="error">{message.text}</StatusMessage>
              )}
            </Box>
          )}
        </Box>
      );
    }
  }
}

// Validate that a raw config can be saved (mirrors rawLexisrcSchema constraints).
function validateRawForSave(raw: RawLexisrc): { ok: boolean; error?: string } {
  if (raw.scope.allowed_targets.length === 0) {
    return { ok: false, error: 'Add at least one target before saving.' };
  }
  const profileCount = Object.keys(raw.auth.profiles).length;
  if (profileCount < 3) {
    return { ok: false, error: 'At least 3 authentication profiles are required.' };
  }
  // lexis: a local provider without a chosen model would resolve to '' and break audits
  if (isLocalProvider(raw.ai.provider) && !raw.ai.model) {
    return { ok: false, error: `Select a model for ${raw.ai.provider} before saving.` };
  }
  return { ok: true };
}

interface LocalModelPickerProps {
  provider: LocalProviderName;
  current: string;
  onPick: (model: string) => void;
  onCancel: () => void;
}

/** Lists the models installed in the user's local server; falls back to manual id. */
function LocalModelPicker({ provider, current, onPick, onCancel }: LocalModelPickerProps): React.ReactElement {
  const [models, setModels] = useState<string[] | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listLocalModels(provider).then((list) => {
      if (!cancelled) setModels(list);
    });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  if (manual) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">
          Model id — provider: {provider}
        </Text>
        <TextInput
          placeholder={provider === 'ollama' ? 'llama3.2' : 'qwen2.5-coder'}
          onSubmit={(value) => {
            if (value.trim()) onPick(value.trim());
          }}
        />
        <Text dimColor>Enter your model id, or Esc to cancel.</Text>
      </Box>
    );
  }

  if (models === null) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">
          Model — provider: {provider}
        </Text>
        <Spinner label={`Querying ${provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'} ...`} />
        <Text dimColor>Esc to cancel</Text>
      </Box>
    );
  }

  if (models.length === 0) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">
          Model — provider: {provider}
        </Text>
        <StatusMessage variant="error">
          Could not reach {provider} at {provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}. Is
          it running?
        </StatusMessage>
        <TextInput
          placeholder={provider === 'ollama' ? 'llama3.2' : 'qwen2.5-coder'}
          onSubmit={(value) => {
            if (value.trim()) onPick(value.trim());
          }}
        />
        <Text dimColor>Enter your model id, or Esc to cancel.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color="cyan">
        Model — provider: {provider} (current: {current || 'none'})
      </Text>
      <Select
        visibleOptionCount={8}
        options={[
          ...models.map((m) => ({ label: m, value: m })),
          { label: 'Enter model name manually...', value: '__manual__' },
          { label: '← Cancel', value: '__cancel__' }
        ]}
        onChange={(value) => {
          if (value === '__cancel__') onCancel();
          else if (value === '__manual__') setManual(true);
          else onPick(value);
        }}
      />
      <Text dimColor>Esc to cancel</Text>
    </Box>
  );
}