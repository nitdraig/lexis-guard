import type { RawLexisrc } from '../config/lexisrc-schema.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
import type { DedupedFinding } from '../core/deduplicator.js';
import type { ReportMeta } from '../reporter/reporter.js';

/**
 * Screen ids of the multi-view TUI.
 */
export type ViewId = 'home' | 'audit' | 'config' | 'history' | 'ai' | 'export';

/**
 * Session state shared across TUI views.
 * `rawConfig` is the editable source of truth (tokens keep ${ENV} placeholders).
 * `findings`/`meta` hold the last completed audit for analysis/export in-UI.
 * `lexisignore` carries the loaded suppressions for reports (optional).
 */
export interface TuiSession {
  rawConfig: RawLexisrc;
  configPath: string | null;
  findings: DedupedFinding[] | null;
  meta: ReportMeta | null;
  lexisignore?: Lexisignore | null;
}