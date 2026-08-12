import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { testBOLA, testBFLA } from './cross-auth-tester.js';
import { resolveProfile } from '../config/profiles.js';

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

function headerValue(
  headers: Record<string, string | string[]>,
  name: string
): string | undefined {
  const val = headers[name.toLowerCase()];
  if (Array.isArray(val)) return val.join(', ');
  return val;
}

const SENSITIVE_KEY_RE = /password|passwd|secret|token|api_key|apikey|credential|ssn|credit_card|cvv|pin|private_key|auth_token|refresh_token|session_id/i;

function findSensitiveKeys(jsonBody: string): string[] {
  try {
    const obj = JSON.parse(jsonBody);
    const keys: string[] = [];
    function walk(value: unknown): void {
      if (Array.isArray(value)) {
        for (const item of value) walk(item);
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          if (SENSITIVE_KEY_RE.test(k)) keys.push(k);
          walk(v);
        }
      }
    }
    walk(obj);
    return [...new Set(keys)];
  } catch {
    return [];
  }
}

/**
 * Security audit module — OWASP Web + API Top 10 checks.
 */
export class SecurityModule implements AuditModule {
  readonly id = 'security';
  readonly name = 'Security';

  async run(_target: string, _config: Lexisrc, engine: HttpEngine, onFinding?: (f: Finding) => void, endpoints?: Endpoint[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    // Stream each finding to the UI the moment it is detected.
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    // 1. Basic headers on root
    const root = await engine.fetch('/', 'GET');
    const headers = root.headers;

    if (!headerValue(headers, 'strict-transport-security')) {
      track(
        finding('MISSING_HSTS', 'GET', '/', 'Missing Strict-Transport-Security header', 'medium',
          'HSTS header not present in response', 'CWE-319', 5.3)
      );
    }

    if (!headerValue(headers, 'x-frame-options')) {
      track(
        finding('MISSING_X_FRAME_OPTIONS', 'GET', '/', 'Missing X-Frame-Options header', 'medium',
          'Clickjacking protection absent', 'CWE-1021', 5.3)
      );
    }

    if (!headerValue(headers, 'x-content-type-options')) {
      track(
        finding('MISSING_X_CONTENT_TYPE_OPTIONS', 'GET', '/', 'Missing X-Content-Type-Options header', 'low',
          'MIME-sniffing not disabled', 'CWE-693', 3.7)
      );
    }

    if (!headerValue(headers, 'content-security-policy')) {
      track(
        finding('MISSING_CSP', 'GET', '/', 'Missing Content-Security-Policy header', 'medium',
          'CSP not configured', 'CWE-693', 5.3)
      );
    }

    const cors = headerValue(headers, 'access-control-allow-origin');
    if (cors === '*') {
      track(
        finding('CORS_WILD_CARD', 'GET', '/', 'CORS allows any origin', 'high',
          'Access-Control-Allow-Origin: *', 'CWE-942', 7.5)
      );
    }

    const server = headerValue(headers, 'server');
    const poweredBy = headerValue(headers, 'x-powered-by');
    if (server || poweredBy) {
      track(
        finding('STACK_LEAK', 'GET', '/', 'Server stack information leaked', 'low',
          `Server: ${server ?? 'n/a'}, X-Powered-By: ${poweredBy ?? 'n/a'}`, 'CWE-200', 3.7)
      );
    }

    // 2. Sensitive file exposure (safe mode: HEAD only)
    const sensitivePaths = ['/.env', '/.git/config', '/.htaccess', '/web.config', '/Dockerfile'];
    for (const path of sensitivePaths) {
      try {
        const resp = await engine.fetch(path, 'HEAD');
        if (resp.statusCode === 200) {
          track(
            finding('SENSITIVE_FILE_EXPOSURE', 'HEAD', path, `Sensitive file exposed: ${path}`, 'high',
              `HEAD ${path} returned 200 OK`, 'CWE-538', 7.5)
          );
        }
      } catch {
        // lexis: ignore connection errors on non-existent paths
      }
    }

    // 3. JWT detection in response (passive)
    const setCookie = headerValue(headers, 'set-cookie');
    if (setCookie && /jwt|token|auth/i.test(setCookie)) {
      track(
        finding('JWT_IN_COOKIE', 'GET', '/', 'JWT or auth token detected in cookie', 'info',
          `Set-Cookie contains token-like value: ${setCookie.slice(0, 40)}...`, 'CWE-522', 2.0)
      );
    }

    // 4. TLS redirect downgrade on HTTPS targets
    const profile = resolveProfile(_config.profile);
    if (profile.checks.includes('tls') && _target.startsWith('https://')) {
      const location = headerValue(headers, 'location');
      if (location && location.startsWith('http://')) {
        track(
          finding('TLS_DOWNGRADE', 'GET', '/', 'HTTPS target redirects to HTTP', 'high',
            `Location header downgrade: ${location.slice(0, 80)}`, 'CWE-319', 7.5)
        );
      }
    }

    // 5. Excessive data exposure — sensitive keys in JSON responses
    if (profile.checks.includes('data_exposure')) {
      const contentType = headerValue(headers, 'content-type') ?? '';
      if (contentType.includes('json') && root.body) {
        const sensitiveKeys = findSensitiveKeys(root.body);
        if (sensitiveKeys.length > 0) {
          track(
            finding('DATA_EXPOSURE', 'GET', '/', 'Sensitive data keys exposed in JSON response', 'medium',
              `Keys: ${sensitiveKeys.join(', ').slice(0, 120)}`, 'CWE-200', 5.3)
          );
        }
      }
    }

    // 6. Broken authentication — unauthenticated access to mutating spec endpoints
    if (profile.checks.includes('broken_auth') && endpoints && endpoints.length > 0) {
      const mutating = endpoints.filter((ep) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(ep.method)).slice(0, 5);
      for (const ep of mutating) {
        try {
          const resp = await engine.fetch(ep.path, ep.method);
          if (resp.statusCode >= 200 && resp.statusCode < 300) {
            track(
              finding('BROKEN_AUTH', ep.method, ep.path, 'Unauthenticated access to protected operation', 'high',
                `${ep.method} ${ep.path} returned ${resp.statusCode} without auth`, 'CWE-306', 7.5)
            );
          }
        } catch {
          // lexis: connection errors on auth probes are not findings
        }
      }
    }

    // 7. Mass assignment — unexpected fields accepted on write ops (aggressive only)
    if (profile.checks.includes('mass_assignment') && _config.mode === 'aggressive' && endpoints && endpoints.length > 0) {
      const writeOps = endpoints.filter((ep) => ['POST', 'PUT', 'PATCH'].includes(ep.method)).slice(0, 3);
      for (const ep of writeOps) {
        try {
          const body = JSON.stringify({ _lexisguard_test: 'value' });
          const resp = await engine.fetch(ep.path, ep.method, { 'content-type': 'application/json' }, body);
          if (resp.statusCode >= 200 && resp.statusCode < 300) {
            track(
              finding('MASS_ASSIGNMENT', ep.method, ep.path, 'Write operation accepted unexpected field', 'medium',
                `${ep.method} ${ep.path} accepted _lexisguard_test field`, 'CWE-915', 6.5)
            );
          }
        } catch {
          // lexis: ignore connection errors on mass-assignment probes
        }
      }
    }

    // 8. BOLA / BFLA — cross-auth authorization tests (spec-driven paths when
    //    a spec is provided, heuristic fallback otherwise). Deep profile only:
    //    these probe cross-user resources and are skipped for quick audits.
    if (profile.checks.includes('bola')) {
      const bolaFindings = await testBOLA(_target, _config, engine, endpoints);
      for (const f of bolaFindings) track(f);
    }

    if (profile.checks.includes('bfla')) {
      const bflaFindings = await testBFLA(_target, _config, engine, endpoints);
      for (const f of bflaFindings) track(f);
    }

    return findings;
  }
}
