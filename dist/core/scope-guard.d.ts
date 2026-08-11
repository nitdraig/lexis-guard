import type { Lexisrc } from '../config/lexisrc-schema.js';
export type GuardResult = {
    ok: true;
} | {
    ok: false;
    reason: string;
};
/**
 * Scope Guard: rejects execution against any host not in
 * `allowed_targets`. No exceptions, no override flags.
 */
export declare function validateScope(target: string, config: Lexisrc): GuardResult;
//# sourceMappingURL=scope-guard.d.ts.map