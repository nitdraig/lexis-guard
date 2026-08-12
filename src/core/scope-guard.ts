import type { Lexisrc } from '../config/lexisrc-schema.js';

/**
 * Extracts hostname from a target string.
 * Accepts raw hostnames or full URLs.
 */
function extractHostname(target: string): string {
  let url = target.trim();
  if (!url.includes('://')) {
    url = 'https://' + url;
  }
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid target URL: ${target}`);
  }
}

/**
 * Checks whether hostname is explicitly allowed.
 * Exact match only — no wildcards, no subdomains unless listed.
 */
function isAllowed(hostname: string, allowed: string[]): boolean {
  return allowed.some((a) => a.toLowerCase() === hostname);
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string };

export type CanonicalizeResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Canonicalize a target to an absolute origin URL. Bare hostnames get the
 * https scheme; full URLs keep theirs (scheme + origin, path dropped).
 */
export function canonicalizeTarget(target: string): CanonicalizeResult {
  try {
    let url = target.trim();
    if (!url.includes('://')) {
      url = `https://${url}`;
    }
    const parsed = new URL(url);
    return { ok: true, url: parsed.origin };
  } catch {
    // Keep the same wording as extractHostname for consistent errors.
    return { ok: false, reason: `Invalid target URL: ${target}` };
  }
}

/**
 * Scope Guard: rejects execution against any host not in
 * `allowed_targets`. No exceptions, no override flags.
 */
export function validateScope(target: string, config: Lexisrc): GuardResult {
  let hostname: string;
  try {
    hostname = extractHostname(target);
  } catch (err) {
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
