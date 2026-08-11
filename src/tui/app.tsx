import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { HomeView } from './views/home.js';
import { AuditView } from './views/audit.js';
import { ConfigView } from './views/config.js';
import { HistoryView } from './views/history.js';
import { AiView } from './views/ai.js';
import { ExportView } from './views/export.js';
import { defaultRawLexisrc } from '../config/default.js';
import type { RawLexisrc } from '../config/lexisrc-schema.js';
import { deduplicate } from '../core/deduplicator.js';
import { Sanitizer } from '../core/sanitizer.js';
import { AuditLog, type SavedSession } from '../core/audit-log.js';
import type { ReportMeta } from '../reporter/reporter.js';
import type { ViewId, TuiSession } from './session.js';

interface AppProps {
  initialRawConfig?: RawLexisrc | null;
  initialConfigPath?: string | null;
  initialTarget?: string | null;
  onQuit?: () => void;
}

export function App({ initialRawConfig, initialConfigPath, initialTarget, onQuit }: AppProps): React.ReactElement {
  const [rawConfig, setRawConfig] = useState<RawLexisrc>(initialRawConfig ?? defaultRawLexisrc());
  const [configPath, setConfigPath] = useState<string | null>(initialConfigPath ?? null);
  const [view, setView] = useState<ViewId>(initialTarget ? 'audit' : 'home');
  const [findings, setFindings] = useState<TuiSession['findings']>(null);
  const [meta, setMeta] = useState<TuiSession['meta']>(null);
  const [auditRunId, setAuditRunId] = useState(0);

  const session: TuiSession = { rawConfig, configPath, findings, meta };

  function storeFindings(target: string, deduped: ReturnType<typeof deduplicate>, durationMs: number): void {
    // lexis: raw config only (no env interpolation) so results survive even if tokens are unset
    const sanitizer = new Sanitizer(rawConfig.scope.allowed_targets);
    const sanitized = deduped.map((f) => sanitizer.sanitizeFinding(f));
    const auditMeta: ReportMeta = {
      target,
      mode: rawConfig.mode,
      timestamp: new Date().toISOString(),
      durationMs,
      incomplete: false
    };
    setFindings(sanitized);
    setMeta(auditMeta);
    setAuditRunId((n) => n + 1);
    new AuditLog().write({
      timestamp: auditMeta.timestamp,
      target,
      mode: rawConfig.mode,
      checks: ['security', 'performance', 'scalability'],
      findings_count: sanitized.length,
      incomplete: false
    });
    new AuditLog().saveSession(auditMeta, sanitized);
    // lexis: stay on the results screen so the user sees the final state
    // and can decide when to go back to the menu (Esc).
  }

  function restoreSession(session: SavedSession): void {
    setFindings(session.findings);
    setMeta(session.meta);
    setAuditRunId((n) => n + 1);
    setView('home');
  }

  return (
    <Box flexDirection="column">
      {view === 'home' && (
        <HomeView
          targetCount={rawConfig.scope.allowed_targets.length}
          mode={rawConfig.mode}
          provider={rawConfig.ai.provider}
          environment={rawConfig.scope.environment}
          hasFindings={findings !== null && findings.length > 0}
          onNavigate={(v) => setView(v)}
          onQuit={() => onQuit?.()}
        />
      )}
      {view === 'audit' && (
        <AuditView
          session={session}
          onStoreFindings={storeFindings}
          onAddTarget={(hostname) =>
            setRawConfig((r) => ({
              ...r,
              scope: { ...r.scope, allowed_targets: [...new Set([...r.scope.allowed_targets, hostname])] }
            }))
          }
          onBack={() => setView('home')}
        />
      )}
      {view === 'config' && (
        <ConfigView
          session={session}
          onUpdateRaw={setRawConfig}
          onUpdatePath={setConfigPath}
          onBack={() => setView('home')}
        />
      )}
      {view === 'history' && (
        <HistoryView onBack={() => setView('home')} onLoadSession={restoreSession} />
      )}
      {view === 'ai' && <AiView session={session} onBack={() => setView('home')} />}
      {view === 'export' && <ExportView session={session} onBack={() => setView('home')} />}

      {auditRunId > 0 && (
        <Text dimColor>Audit saved to history. Results are ready for AI consultation / Export.</Text>
      )}
    </Box>
  );
}