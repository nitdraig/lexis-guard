import { rawLexisrcSchema, lexisrcSchema } from './lexisrc-schema.js';
import { defaultModel } from '../ai/models.js';
const envVarPattern = /\$\{([^}]+)\}/g;
/**
 * Replace `${ENV_VAR}` with `process.env[ENV_VAR]`.
 * Throws if any referenced env var is missing.
 */
function interpolateEnvVars(value) {
    const missing = [];
    const resolved = value.replace(envVarPattern, (_match, varName) => {
        const envValue = process.env[varName];
        if (envValue === undefined || envValue === '') {
            missing.push(varName);
            return '${' + varName + '}';
        }
        return envValue;
    });
    if (missing.length > 0) {
        throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
    }
    return resolved;
}
/**
 * Interpolate env vars inside auth profile tokens.
 */
function resolveAuthProfiles(raw) {
    const resolved = {};
    for (const [name, profile] of Object.entries(raw)) {
        resolved[name] = {
            type: profile.type,
            token: interpolateEnvVars(profile.token),
            role: profile.role,
            owns: profile.owns
        };
    }
    return resolved;
}
/**
 * Check multi-auth requirement: at least 3 profiles for BOLA/BFLA tests.
 * Two non-admin profiles with disjoint `owns` resources + one admin.
 */
function validateMultiAuth(config) {
    const errors = [];
    const profiles = Object.entries(config.auth.profiles);
    if (profiles.length < 3) {
        errors.push(`Multi-auth requires at least 3 profiles (user_a, user_b, admin). Found ${profiles.length}.`);
        return errors;
    }
    const adminProfiles = profiles.filter(([, p]) => p.role === 'admin');
    if (adminProfiles.length === 0) {
        errors.push('At least one admin profile is required for BFLA testing.');
    }
    const standardProfiles = profiles.filter(([, p]) => p.role === 'standard');
    if (standardProfiles.length < 2) {
        errors.push('At least two standard profiles are required for BOLA testing.');
    }
    // Check that standard profiles have non-empty owns
    for (const [name, profile] of standardProfiles) {
        if (profile.owns.length === 0) {
            errors.push(`Standard profile "${name}" must declare owned resources in "owns".`);
        }
    }
    return errors;
}
/**
 * Parse raw `.lexisrc.json` content with env var interpolation.
 *
 * Steps:
 * 1. Parse JSON.
 * 2. Validate against raw schema (structure + defaults).
 * 3. Interpolate `${ENV_VAR}` in auth tokens.
 * 4. Validate resolved data against strict schema.
 * 5. Validate multi-auth requirements.
 */
export function parseLexisrc(content) {
    let raw;
    if (typeof content === 'string') {
        try {
            raw = JSON.parse(content);
        }
        catch {
            return { ok: false, errors: ['Invalid JSON'] };
        }
    }
    else {
        raw = content;
    }
    const parsed = rawLexisrcSchema.safeParse(raw);
    if (!parsed.success) {
        const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return { ok: false, errors };
    }
    let resolved;
    try {
        resolved = {
            scope: parsed.data.scope,
            mode: parsed.data.mode,
            auth: {
                profiles: resolveAuthProfiles(parsed.data.auth.profiles)
            },
            ai: {
                provider: parsed.data.ai.provider,
                redact_target: parsed.data.ai.redact_target,
                local_fallback: parsed.data.ai.local_fallback,
                model: parsed.data.ai.model ?? defaultModel(parsed.data.ai.provider),
                api_key: parsed.data.ai.api_key ?? ''
            },
            limits: parsed.data.limits
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, errors: [message] };
    }
    const strict = lexisrcSchema.safeParse(resolved);
    if (!strict.success) {
        const errors = strict.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return { ok: false, errors };
    }
    const multiAuthErrors = validateMultiAuth(strict.data);
    if (multiAuthErrors.length > 0) {
        return { ok: false, errors: multiAuthErrors };
    }
    return { ok: true, data: strict.data };
}
/**
 * Strict version — throws on any error.
 */
export function parseLexisrcStrict(content) {
    const result = parseLexisrc(content);
    if (!result.ok) {
        throw new Error(result.errors.join('\n'));
    }
    return result.data;
}
//# sourceMappingURL=lexisrc-parser.js.map