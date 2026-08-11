import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
/**
 * Security audit module — OWASP Web + API Top 10 checks.
 */
export declare class SecurityModule implements AuditModule {
    readonly id = "security";
    readonly name = "Security";
    run(_target: string, _config: Lexisrc, engine: HttpEngine, onFinding?: (f: Finding) => void): Promise<Finding[]>;
}
//# sourceMappingURL=security-module.d.ts.map