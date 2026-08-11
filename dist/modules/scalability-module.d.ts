import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
/**
 * Scalability audit module — rate limiting detection and soak test.
 */
export declare class ScalabilityModule implements AuditModule {
    readonly id = "scalability";
    readonly name = "Scalability";
    run(_target: string, config: Lexisrc, engine: HttpEngine, onFinding?: (f: Finding) => void): Promise<Finding[]>;
}
//# sourceMappingURL=scalability-module.d.ts.map