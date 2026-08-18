import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, TextInput, StatusMessage } from '@inkjs/ui';
import { writeFileSync } from 'node:fs';
import { JsonReporter } from '../../reporter/json-reporter.js';
import { MarkdownReporter } from '../../reporter/markdown-reporter.js';
import { SarifReporter } from '../../reporter/sarif-reporter.js';
import { HtmlReporter } from '../../reporter/html-reporter.js';
import type { Reporter } from '../../reporter/reporter.js';
import type { TuiSession } from '../session.js';

type ExportFormat = 'json' | 'markdown' | 'sarif' | 'html';

interface ExportViewProps {
  session: TuiSession;
  onBack: () => void;
}

const FORMAT_REPORTERS: Record<ExportFormat, new () => Reporter> = {
  json: JsonReporter,
  markdown: MarkdownReporter,
  sarif: SarifReporter,
  html: HtmlReporter
};

export function ExportView({ session, onBack }: ExportViewProps): React.ReactElement {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const findings = session.findings ?? [];
  const meta = session.meta;

  function doExport(value: string): void {
    const outPath = value.trim();
    if (!outPath) {
      setMessage({ ok: false, text: 'Empty path.' });
      return;
    }
    if (!session.meta) return;
    try {
      const reporter = new FORMAT_REPORTERS[format]();
      const content = reporter.generate(findings, session.meta, session.lexisignore ?? undefined);
      writeFileSync(outPath, content, 'utf-8');
      setMessage({ ok: true, text: `Report exported to ${outPath}` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }

  if (findings.length === 0 || !meta) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">Export results</Text>
        <Text dimColor>Run an audit first to have results to export.</Text>
        <Select options={[{ label: '← Back', value: 'back' }]} onChange={onBack} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color="cyan">Export results — {findings.length} findings</Text>
      <Text dimColor>Formato:</Text>
      <Select
        options={[
          { label: 'JSON', value: 'json' },
          { label: 'Markdown', value: 'markdown' },
          { label: 'SARIF', value: 'sarif' },
          { label: 'HTML', value: 'html' }
        ]}
        onChange={(value) => setFormat(value as ExportFormat)}
      />
      <Box marginTop={1}>
        <TextInput
          placeholder={`report.${format === 'markdown' ? 'md' : format === 'sarif' ? 'sarif' : format === 'html' ? 'html' : 'json'}`}
          onSubmit={doExport}
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
      <Box marginTop={1}>
        <Select options={[{ label: '← Back', value: 'back' }]} onChange={onBack} />
      </Box>
    </Box>
  );
}