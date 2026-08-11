/**
 * Quick / Deep audit profiles.
 *
 * Quick: essential security + performance checks only.
 * Deep: full suite including scalability, BOLA/BFLA cross-auth, soak tests.
 *
 * These are explicit matrices so adding a new check requires updating
 * the profile definition, not the orchestrator.
 */
export type CheckId = 'headers' | 'cors' | 'tls' | 'file_exposure' | 'jwt_detection' | 'bola' | 'bfla' | 'latency' | 'payload_compression' | 'http2' | 'rate_limit' | 'soak_test' | 'throttle_state';
export interface ProfileDefinition {
    id: 'quick' | 'deep';
    name: string;
    checks: CheckId[];
}
export declare const QUICK_PROFILE: ProfileDefinition;
export declare const DEEP_PROFILE: ProfileDefinition;
export declare const PROFILES: Record<string, ProfileDefinition>;
export declare function resolveProfile(profileId?: string): ProfileDefinition;
//# sourceMappingURL=profiles.d.ts.map