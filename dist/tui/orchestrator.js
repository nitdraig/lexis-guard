/**
 * Runs audit modules sequentially while broadcasting progress.
 */
export async function runAudit(modules, target, config, engine, callbacks) {
    const t0 = Date.now();
    const allFindings = [];
    for (const mod of modules) {
        const modT0 = Date.now();
        callbacks.onProgress({ moduleId: mod.id, name: mod.name, status: 'running', findings: [], elapsedMs: 0 });
        try {
            const findings = await mod.run(target, config, engine, callbacks.onFinding);
            allFindings.push(...findings);
            callbacks.onProgress({ moduleId: mod.id, name: mod.name, status: 'done', findings, elapsedMs: Date.now() - modT0 });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            callbacks.onProgress({ moduleId: mod.id, name: mod.name, status: 'error', findings: [], errorMessage: message, elapsedMs: Date.now() - modT0 });
            callbacks.onError(new Error(`${mod.id}: ${message}`));
        }
        callbacks.onThrottleState(engine.getThrottleState());
    }
    callbacks.onComplete(allFindings, Date.now() - t0);
}
//# sourceMappingURL=orchestrator.js.map