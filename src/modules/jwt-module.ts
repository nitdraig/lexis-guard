import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { createHmac } from 'node:crypto';

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

/** Encode a JWT segment (base64url, no padding). */
function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/** Decode a JWT segment without signature verification. */
function decodeSegment(segment: string): string | null {
  try {
    return Buffer.from(segment, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

function parseJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const headerRaw = decodeSegment(parts[0]);
  const payloadRaw = decodeSegment(parts[1]);
  if (!headerRaw || !payloadRaw) return null;
  try {
    return {
      header: JSON.parse(headerRaw) as Record<string, unknown>,
      payload: JSON.parse(payloadRaw) as Record<string, unknown>
    };
  } catch {
    return null;
  }
}

const WEAK_SECRETS = [
  'secret', 'password', 'changeme', 'admin', 'supersecret',
  'jwtsecret', 'mysecret', 'key', '123456', 'secretkey',
  'letmein', 'qwerty', 'default', 'test', 'guest',
  'welcome', 'iloveyou', 'monkey', 'dragon', 'shadow'
];

const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

function extractJwt(text: string): string | null {
  const match = text.match(JWT_RE);
  return match ? match[0] : null;
}

function buildJwt(header: object, payload: object, secret: string): string {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

/**
 * JWT attack vectors — alg none, weak secret, algorithm confusion.
 * Only reports a finding when the server accepts the modified token.
 */
export class JwtModule implements AuditModule {
  readonly id = 'jwt';
  readonly name = 'JWT attacks';

  async run(
    _target: string,
    config: Lexisrc,
    engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    const path = this.probePath(endpoints);
    const method = this.probeMethod(endpoints);

    // Discover a JWT from a bearer token in config or the root response.
    const token = await this.discoverToken(engine, config);
    if (!token) return findings;

    const parsed = parseJwt(token);
    if (!parsed) return findings;

    // Baseline response without a forged token: a 2xx here means the endpoint
    // does not actually enforce authentication, so any 2xx to a forged token
    // is not evidence of a JWT bypass.
    const baseline = await this.baselineResponse(path, method, engine);

    // 1. alg:none — strip signature, set alg none.
    try {
      const noneHeader = { ...parsed.header, alg: 'none' };
      const noneToken = `${b64url(JSON.stringify(noneHeader))}.${b64url(JSON.stringify(parsed.payload))}.`;
      const accepted = await this.tokenAccepted(noneToken, path, method, engine, baseline);
      if (accepted) {
        track(
          finding('JWT_ALG_NONE_ACCEPTED', method, path, 'JWT alg:none accepted by server', 'critical',
            `Server accepted a token with alg=none and no signature`, 'CWE-345', 9.1)
        );
      }
    } catch {
      // lexis: ignore connection errors on alg:none probe
    }

    // 2. Weak secret — try a short internal wordlist.
    for (const secret of WEAK_SECRETS) {
      const forged = buildJwt({ ...parsed.header, alg: 'HS256' }, parsed.payload, secret);
      try {
        if (await this.tokenAccepted(forged, path, method, engine, baseline)) {
          track(
            finding('JWT_WEAK_SECRET', method, path, 'JWT signed with a weak HMAC secret', 'high',
              `Server accepted a token signed with the weak secret "${secret}"`, 'CWE-327', 7.5)
          );
          break;
        }
      } catch {
        // lexis: ignore connection errors on weak-secret probe
      }
    }

    // 3. Algorithm confusion — RS256 public key as HMAC secret is only
    //    possible when a public key is available. We do not fetch one here;
    //    this vector is documented and deferred to a future pass.
    return findings;
  }

  private probePath(endpoints?: Endpoint[]): string {
    if (endpoints && endpoints.length > 0) {
      return endpoints.find((e) => e.method === 'GET')?.path ?? '/';
    }
    return '/';
  }

  private probeMethod(endpoints?: Endpoint[]): string {
    return endpoints?.find((e) => e.method === 'GET')?.method ?? 'GET';
  }

  private async discoverToken(engine: HttpEngine, config: Lexisrc): Promise<string | null> {
    // Prefer a bearer token in the config (any standard profile).
    for (const profile of Object.values(config.auth.profiles)) {
      if (profile.type === 'bearer' && /\beyJ/.test(profile.token)) {
        return profile.token;
      }
    }
    // Fall back to a JWT in the root response.
    try {
      const resp = await engine.fetch('/', 'GET');
      return extractJwt(resp.body);
    } catch {
      return null;
    }
  }

  private async baselineResponse(
    path: string,
    method: string,
    engine: HttpEngine
  ): Promise<{ statusCode: number; body: string } | null> {
    try {
      const resp = await engine.fetch(path, method);
      return { statusCode: resp.statusCode, body: resp.body };
    } catch {
      return null;
    }
  }

  private async tokenAccepted(
    token: string,
    path: string,
    method: string,
    engine: HttpEngine,
    baseline: { statusCode: number; body: string } | null
  ): Promise<boolean> {
    const resp = await engine.fetch(path, method, { Authorization: `Bearer ${token}` });
    const is2xx = resp.statusCode >= 200 && resp.statusCode < 300;
    // lexis: a 2xx alone is not evidence; require the forged token to change
    // the response vs. the unauthenticated baseline.
    if (!is2xx) return false;
    if (!baseline) return false;
    return baseline.statusCode !== resp.statusCode || baseline.body !== resp.body;
  }
}
