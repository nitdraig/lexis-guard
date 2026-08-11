/**
 * Build request headers for a given auth profile.
 */
export function getAuthHeaders(profile) {
    switch (profile.type) {
        case 'bearer':
            return { Authorization: `Bearer ${profile.token}` };
        case 'api_key':
            // lexis: single api_key style; extend if project adds key-in-query
            return { 'X-API-Key': profile.token };
        case 'basic': {
            const encoded = Buffer.from(profile.token).toString('base64');
            return { Authorization: `Basic ${encoded}` };
        }
        default: {
            const _exhaustive = profile.type;
            throw new Error(`Unsupported auth type: ${_exhaustive}`);
        }
    }
}
/**
 * Auth Guard: resolves profiles from config into typed buckets.
 * Returns standard and admin profiles separately for BOLA/BFLA tests.
 */
export function resolveAuthProfiles(config) {
    const errors = [];
    const profiles = config.auth.profiles;
    const standard = {};
    const admin = {};
    for (const [name, profile] of Object.entries(profiles)) {
        if (profile.role === 'standard') {
            standard[name] = profile;
        }
        else if (profile.role === 'admin') {
            admin[name] = profile;
        }
    }
    if (Object.keys(standard).length < 2) {
        errors.push(`BOLA testing requires at least 2 standard profiles. Found ${Object.keys(standard).length}.`);
    }
    if (Object.keys(admin).length < 1) {
        errors.push('BFLA testing requires at least 1 admin profile.');
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, profiles, standard, admin };
}
//# sourceMappingURL=auth-guard.js.map