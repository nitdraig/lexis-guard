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
export async function runAudit(
  modules: AuditModule[],
  target: string,
  config: Lexisrc,
  engine: HttpEngine,
  callbacks: OrchestratorCallbacks
): Promise<void> {
  const t0 = Date.now();
  const allFindings: Finding[] = [];

  for (const mod of modules) {
    const modT0 = Date.now();
    callbacks.onProgress({ moduleId: mod.id, name: mod.name, status: 'running', findings: [], elapsedMs: 0 });

    try {
      const findings = await mod.run(target, config, engine, callbacks.onFinding);
      allFindings.push(...findings);
      callbacks.onProgress({ moduleId: mod.id, name: mod.name, status: 'done', findings, elapsedMs: Date.now() - modT0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      callbacks.onProgress({ moduleId: mod.id, name: mod.name, status: 'error', findings: [], errorMessage: message, elapsedMs: Date.now() - modT0 });
      callbacks.onError(new Error(`${mod.id}: ${message}`));
    }

    callbacks.onThrottleState(engine.getThrottleState());
  }

  callbacks.onComplete(allFindings, Date.now() - t0);
}
