import type { Lexisrc, AuthProfile } from '../config/lexisrc-schema.js';
export type AuthHeaders = Record<string, string>;
/**
 * Build request headers for a given auth profile.
 */
export declare function getAuthHeaders(profile: AuthProfile): AuthHeaders;
export type ResolveResult = {
    ok: true;
    profiles: Record<string, AuthProfile>;
    standard: Record<string, AuthProfile>;
    admin: Record<string, AuthProfile>;
} | {
    ok: false;
    errors: string[];
};
/**
 * Auth Guard: resolves profiles from config into typed buckets.
 * Returns standard and admin profiles separately for BOLA/BFLA tests.
 */
export declare function resolveAuthProfiles(config: Lexisrc): ResolveResult;
//# sourceMappingURL=auth-guard.d.ts.map