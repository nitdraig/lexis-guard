import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';

/**
 * Common interface for all audit modules.
 * Adding a new module does not require touching the orchestrator.
 */
export interface AuditModule {
  /** Unique identifier for the module. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;

  /**
   * Run the audit against the target.
   * @param target — base URL of the API under test.
   * @param config — parsed `.lexisrc.json`.
   * @param engine — shared HTTP engine with throttle + concurrency control.
   */
  run(
    target: string,
    config: Lexisrc,
    engine: HttpEngine,
    onFinding?: (finding: Finding) => void
  ): Promise<Finding[]>;
}
