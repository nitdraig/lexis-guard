import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
/**
 * Performance audit module — latency, payload, protocol support.
 */
export declare class PerformanceModule implements AuditModule {
    readonly id = "performance";
    readonly name = "Performance";
    run(target: string, _config: Lexisrc, engine: HttpEngine, onFinding?: (f: Finding) => void): Promise<Finding[]>;
}
//# sourceMappingURL=performance-module.d.ts.map