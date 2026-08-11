/**
 * Extracts hostname from a target string.
 * Accepts raw hostnames or full URLs.
 */
function extractHostname(target) {
    let url = target.trim();
    if (!url.includes('://')) {
        url = 'https://' + url;
    }
    try {
        return new URL(url).hostname.toLowerCase();
    }
    catch {
        throw new Error(`Invalid target URL: ${target}`);
    }
}
/**
 * Checks whether hostname is explicitly allowed.
 * Exact match only — no wildcards, no subdomains unless listed.
 */
function isAllowed(hostname, allowed) {
    return allowed.some((a) => a.toLowerCase() === hostname);
}
/**
 * Scope Guard: rejects execution against any host not in
 * `allowed_targets`. No exceptions, no override flags.
 */
export function validateScope(target, config) {
    let hostname;
    try {
        hostname = extractHostname(target);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: message };
    }
    if (isAllowed(hostname, config.scope.allowed_targets)) {
        return { ok: true };
    }
    return {
        ok: false,
        reason: `Target "${hostname}" is not in the allowed list: [${config.scope.allowed_targets.join(', ')}]`
    };
}
//# sourceMappingURL=scope-guard.js.map