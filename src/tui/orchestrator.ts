import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { AuditModule } from '../modules/audit-module.js';

export interface OrchestratorProgress {
  moduleId: string;
  status: 'pending' | 'running' | 'done' | 'error';
  findings: Finding[];
}

export interface OrchestratorCallbacks {
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
    callbacks.onProgress({ moduleId: mod.id, status: 'running', findings: [] });

    try {
      const findings = await mod.run(target, config, engine);
      allFindings.push(...findings);
      callbacks.onProgress({ moduleId: mod.id, status: 'done', findings });
    } catch (err) {
      callbacks.onProgress({ moduleId: mod.id, status: 'error', findings: [] });
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }

    callbacks.onThrottleState(engine.getThrottleState());
  }

  callbacks.onComplete(allFindings, Date.now() - t0);
}
