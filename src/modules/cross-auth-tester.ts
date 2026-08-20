import type { Finding } from '../types/finding.js';
import type { Lexisrc, AuthProfile } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';

function finding(
  ruleId: string,
  method: string,
  path: string,
  description: string,
  severity: Finding['severity'],
  evidence: string,
  cwe?: string,
  cvss?: number
): Finding {
  return {
    hash: generateFindingHash(ruleId, path, method),
    rule_id: ruleId,
    method,
    path,
    description,
    severity,
    evidence,
    cwe,
    cvss
  };
}

function getAuthHeader(profile: AuthProfile): Record<string, string> {
  switch (profile.type) {
    case 'bearer':
      return { Authorization: `Bearer ${profile.token}` };
    case 'api_key':
      return { 'X-API-Key': profile.token };
    case 'basic':
      return { Authorization: `Basic ${Buffer.from(profile.token).toString('base64')}` };
    case 'oauth2':
    case 'oidc':
      return { Authorization: `Bearer ${profile.token}` };
    default: {
      const _exhaustive: never = profile.type;
      throw new Error(`Unsupported auth type: ${_exhaustive}`);
    }
  }
}

/**
 * Map an `owns` resource (e.g. "order:1001") to a probe path.
 *
 * With a spec: find a path template whose parameterized segment matches the
 * resource type (e.g. `/orders/{orderId}` for "order") and inject the id.
 * Without a spec: keep the historical heuristic `/{type}s/{id}`.
 *
 * Returns null when the spec provides no matching template — the caller skips
 * the resource instead of guessing (documented Phase B limitation).
 */
function probePathForResource(resource: string, endpoints: Endpoint[] | undefined): string | null {
  const [type, id] = resource.split(':');
  if (!type || !id) return null;

  const typeLower = type.toLowerCase();
  if (endpoints && endpoints.length > 0) {
    for (const ep of endpoints) {
      const segments = ep.path.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const prev = segments[segments.length - 2];
      if (!last || !prev || !last.startsWith('{') || !last.endsWith('}')) continue;
      const prevLower = prev.toLowerCase();
      if (prevLower === typeLower || prevLower === `${typeLower}s` || prevLower === `${typeLower}es`) {
        // Substitute the id into the full template, preserving any prefix
        // segments (e.g. /v2/orders/{orderId} -> /v2/orders/1001).
        return ep.path.replace(/\{[^}]+\}/, id);
      }
    }
    // lexis: spec present but no template matches this resource — skip,
    // do not fall back to the heuristic (spec drives probing).
    return null;
  }
  return `/${type}s/${id}`;
}

/**
 * Admin paths to probe for BFLA.
 * With a spec: paths whose segments contain "admin" (e.g. `/admin/users/{id}`),
 * deduplicated. Without a spec: the historical hard-coded list.
 */
function adminProbePaths(endpoints: Endpoint[] | undefined): string[] {
  if (endpoints && endpoints.length > 0) {
    const seen = new Set<string>();
    const paths: string[] = [];
    for (const ep of endpoints) {
      const segments = ep.path.split('/').filter(Boolean);
      if (segments.some((s) => s.toLowerCase() === 'admin')) {
        if (!seen.has(ep.path)) {
          seen.add(ep.path);
          paths.push(ep.path);
        }
      }
    }
    return paths;
  }
  return ['/admin/users', '/admin/roles', '/admin/config'];
}

/**
 * BOLA (Broken Object Level Authorization) test:
 * User A tries to access resources owned by User B.
 * If the server returns 200, it's a BOLA violation.
 */
export async function testBOLA(
  _target: string,
  config: Lexisrc,
  engine: HttpEngine,
  endpoints?: Endpoint[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const profiles = Object.entries(config.auth.profiles);
  const standardProfiles = profiles.filter(([, p]) => p.role === 'standard');

  // lexis: need at least 2 standard profiles with disjoint owns
  if (standardProfiles.length < 2) {
    return findings;
  }

  // Build a map: profile_name -> owned resources
  const ownershipMap = new Map<string, string[]>();
  for (const [name, profile] of standardProfiles) {
    ownershipMap.set(name, profile.owns);
  }

  // Test: each user tries to access every other user's resources
  for (const [attackerName, attackerProfile] of standardProfiles) {
    const attackerHeaders = getAuthHeader(attackerProfile);

    for (const [victimName, victimProfile] of standardProfiles) {
      if (attackerName === victimName) continue;

      for (const resource of victimProfile.owns) {
        const path = probePathForResource(resource, endpoints);
        if (!path) continue;

        try {
          const resp = await engine.fetch(path, 'GET', attackerHeaders);
          if (resp.statusCode >= 200 && resp.statusCode < 300) {
            findings.push(
              finding(
                'BOLA_ACCESS_CROSS_USER',
                'GET',
                path,
                `BOLA: ${attackerName} accessed ${victimName}'s resource ${resource}`,
                'high',
                `Request with ${attackerName} token to ${path} returned ${resp.statusCode}. ` +
                  `Expected 403/404.`,
                'CWE-639',
                7.5
              )
            );
          }
        } catch {
          // lexis: ignore connection errors on cross-auth probes
        }
      }
    }
  }

  return findings;
}

/**
 * BFLA (Broken Function Level Authorization) test:
 * Standard user tries to perform admin-only operations.
 * If the server accepts the request, it's a BFLA violation.
 */
export async function testBFLA(
  _target: string,
  config: Lexisrc,
  engine: HttpEngine,
  endpoints?: Endpoint[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const profiles = Object.entries(config.auth.profiles);
  const standardProfiles = profiles.filter(([, p]) => p.role === 'standard');
  const adminProfiles = profiles.filter(([, p]) => p.role === 'admin');

  if (adminProfiles.length === 0 || standardProfiles.length === 0) {
    return findings;
  }

  // lexis: spec-driven admin paths when a spec is provided (no guessing);
  // hard-coded common patterns are the no-spec fallback for MVP.
  const adminPaths = adminProbePaths(endpoints);

  for (const [stdName, stdProfile] of standardProfiles) {
    const headers = getAuthHeader(stdProfile);

    for (const path of adminPaths) {
      try {
        const resp = await engine.fetch(path, 'GET', headers);
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          findings.push(
            finding(
              'BFLA_ADMIN_ACCESS',
              'GET',
              path,
              `BFLA: standard user ${stdName} accessed admin endpoint ${path}`,
              'critical',
              `Request with standard role token returned ${resp.statusCode}. ` +
                `Expected 403.`,
              'CWE-285',
              9.0
            )
          );
        }
      } catch {
        // lexis: ignore connection errors on BFLA probes
      }
    }
  }

  return findings;
}
