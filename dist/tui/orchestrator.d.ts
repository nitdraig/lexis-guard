import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { AuditModule } from '../modules/audit-module.js';
export interface OrchestratorProgress {
    moduleId: string;
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
    findings: Finding[];
    errorMessage?: string;
    elapsedMs?: number;
}
export interface OrchestratorCallbacks {
    /** Called as soon as a module detects a finding (live streaming to the UI). */
    onFinding?(finding: Finding): void;
    onProgress(progress: OrchestratorProgress): void;
    onThrottleState(state: string): void;
    onComplete(findings: Finding[], durationMs: number): void;
    onError(err: Error): void;
}
/**
 * Runs audit modules sequentially while broadcasting progress.
 */
export declare function runAudit(modules: AuditModule[], target: string, config: Lexisrc, engine: HttpEngine, callbacks: OrchestratorCallbacks): Promise<void>;
//# sourceMappingURL=orchestrator.d.ts.map