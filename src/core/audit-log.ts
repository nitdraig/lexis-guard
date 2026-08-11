import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface AuditLogEntry {
  timestamp: string;
  target: string;
  mode: string;
  checks: string[];
  findings_count: number;
  incomplete: boolean;
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

  getPath(): string {
    return this.logPath;
  }
}
