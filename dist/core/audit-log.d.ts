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
export declare class AuditLog {
    private readonly logPath;
    constructor(logPath?: string);
    private ensureDir;
    write(entry: AuditLogEntry): void;
    /**
     * Read all entries, newest first. Skips malformed lines.
     */
    read(): AuditLogEntry[];
    getPath(): string;
    private sessionsDir;
    private sessionFileName;
    /**
     * Persist a full audit result (sanitized findings + meta) as its own JSON file.
     * Returns the written file path.
     */
    saveSession(meta: ReportMeta, findings: DedupedFinding[]): string;
    /** Saved sessions, newest first. Corrupt files are skipped. */
    listSessions(): SavedSession[];
    /** Load one saved session by id (file name without extension). Null when missing/corrupt. */
    loadSession(id: string): SavedSession | null;
}
//# sourceMappingURL=audit-log.d.ts.map