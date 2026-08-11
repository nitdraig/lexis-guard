/**
 * Quick / Deep audit profiles.
 *
 * Quick: essential security + performance checks only.
 * Deep: full suite including scalability, BOLA/BFLA cross-auth, soak tests.
 *
 * These are explicit matrices so adding a new check requires updating
 * the profile definition, not the orchestrator.
 */
export const QUICK_PROFILE = {
    id: 'quick',
    name: 'Quick',
    checks: [
        'headers',
        'cors',
        'file_exposure',
        'jwt_detection',
        'latency',
        'rate_limit'
    ]
};
export const DEEP_PROFILE = {
    id: 'deep',
    name: 'Deep',
    checks: [
        'headers',
        'cors',
        'tls',
        'file_exposure',
        'jwt_detection',
        'bola',
        'bfla',
        'latency',
        'payload_compression',
        'http2',
        'rate_limit',
        'soak_test',
        'throttle_state'
    ]
};
export const PROFILES = {
    quick: QUICK_PROFILE,
    deep: DEEP_PROFILE
};
export function resolveProfile(profileId) {
    if (!profileId)
        return QUICK_PROFILE;
    return PROFILES[profileId] ?? QUICK_PROFILE;
}
//# sourceMappingURL=profiles.js.map