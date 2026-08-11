import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { ReportMeta } from '../reporter/reporter.js';
import type { DedupedFinding } from './deduplicator.js';

export interface AuditLogEntry {
  timestamp: string;
  target: string;
  mode: string;
  checks: string[];
  findings_count: number;
  incomplete: boolean;
}

/** A full audit result persisted on disk, replayable into the workbench session. */
export interface SavedSession {
  meta: ReportMeta;
  findings: DedupedFinding[];
}

/**
 * Immutable audit log writer.
 * Each execution appends one line of JSON to the log file.
 * Default location: ~/.lexisguard/audit.log
 */
export class AuditLog {
  private readonly logPath: string;

  constructor(logPath?: string) {
    this.logPath = logPath ?? join(homedir(), '.lexisguard', 'audit.log');
    this.ensureDir();
  }

  private ensureDir(): void {
    const dir = this.logPath.substring(0, this.logPath.lastIndexOf('/')) || this.logPath.substring(0, this.logPath.lastIndexOf('\\'));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  write(entry: AuditLogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(this.logPath, line, 'utf-8');
  }

  /**
   * Read all entries, newest first. Skips malformed lines.
   */
  read(): AuditLogEntry[] {
    if (!existsSync(this.logPath)) {
      return [];
    }
    const lines = readFileSync(this.logPath, 'utf-8').split('\n');
    const entries: AuditLogEntry[] = [];
    for (const line of lines) {
      if (line.trim() === '') continue;
      try {
        const entry = JSON.parse(line) as AuditLogEntry;
        if (entry && typeof entry.timestamp === 'string') {
          entries.push(entry);
        }
      } catch {
        // lexis: skip malformed lines so one corrupt entry never breaks history
      }
    }
    return entries.reverse();
  }

  getPath(): string {
    return this.logPath;
  }

  private sessionsDir(): string {
    return join(dirname(this.logPath), 'sessions');
  }

  private sessionFileName(timestamp: string): string {
    // lexis: ISO timestamps contain ':' which is invalid on Windows filenames
    return timestamp.replace(/[:]/g, '-') + '.json';
  }

  /**
   * Persist a full audit result (sanitized findings + meta) as its own JSON file.
   * Returns the written file path.
   */
  saveSession(meta: ReportMeta, findings: DedupedFinding[]): string {
    const dir = this.sessionsDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const file = join(dir, this.sessionFileName(meta.timestamp));
    writeFileSync(file, JSON.stringify({ meta, findings }, null, 2), 'utf-8');
    return file;
  }

  /** Saved sessions, newest first. Corrupt files are skipped. */
  listSessions(): SavedSession[] {
    const dir = this.sessionsDir();
    if (!existsSync(dir)) {
      return [];
    }
    const sessions: SavedSession[] = [];
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      const session = this.loadSession(name.replace(/\.json$/, ''));
      if (session) sessions.push(session);
    }
    return sessions.sort((a, b) => (a.meta.timestamp < b.meta.timestamp ? 1 : -1));
  }

  /** Load one saved session by id (file name without extension). Null when missing/corrupt. */
  loadSession(id: string): SavedSession | null {
    const file = join(this.sessionsDir(), `${id}.json`);
    if (!existsSync(file)) {
      return null;
    }
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf-8')) as SavedSession;
      if (parsed && parsed.meta && typeof parsed.meta.timestamp === 'string' && Array.isArray(parsed.findings)) {
        return parsed;
      }
      return null;
    } catch {
      // lexis: a corrupt session file is skipped, not fatal
      return null;
    }
  }
}
