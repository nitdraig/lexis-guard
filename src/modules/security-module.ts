import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { testBOLA, testBFLA } from './cross-auth-tester.js';

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

/**
 * Security audit module — OWASP Web + API Top 10 checks.
 */
export class SecurityModule implements AuditModule {
  readonly id = 'security';
  readonly name = 'Security';

  async run(_target: string, _config: Lexisrc, engine: HttpEngine): Promise<Finding[]> {
    const findings: Finding[] = [];

    // 1. Basic headers on root
    const root = await engine.fetch('/', 'GET');
    const headers = root.headers;

    if (!headerValue(headers, 'strict-transport-security')) {
      findings.push(
        finding('MISSING_HSTS', 'GET', '/', 'Missing Strict-Transport-Security header', 'medium',
          'HSTS header not present in response', 'CWE-319', 5.3)
      );
    }

    if (!headerValue(headers, 'x-frame-options')) {
      findings.push(
        finding('MISSING_X_FRAME_OPTIONS', 'GET', '/', 'Missing X-Frame-Options header', 'medium',
          'Clickjacking protection absent', 'CWE-1021', 5.3)
      );
    }

    if (!headerValue(headers, 'x-content-type-options')) {
      findings.push(
        finding('MISSING_X_CONTENT_TYPE_OPTIONS', 'GET', '/', 'Missing X-Content-Type-Options header', 'low',
          'MIME-sniffing not disabled', 'CWE-693', 3.7)
      );
    }

    if (!headerValue(headers, 'content-security-policy')) {
      findings.push(
        finding('MISSING_CSP', 'GET', '/', 'Missing Content-Security-Policy header', 'medium',
          'CSP not configured', 'CWE-693', 5.3)
      );
    }

    const cors = headerValue(headers, 'access-control-allow-origin');
    if (cors === '*') {
      findings.push(
        finding('CORS_WILD_CARD', 'GET', '/', 'CORS allows any origin', 'high',
          'Access-Control-Allow-Origin: *', 'CWE-942', 7.5)
      );
    }

    const server = headerValue(headers, 'server');
    const poweredBy = headerValue(headers, 'x-powered-by');
    if (server || poweredBy) {
      findings.push(
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
          findings.push(
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
      findings.push(
        finding('JWT_IN_COOKIE', 'GET', '/', 'JWT or auth token detected in cookie', 'info',
          `Set-Cookie contains token-like value: ${setCookie.slice(0, 40)}...`, 'CWE-522', 2.0)
      );
    }

    // 4. BOLA / BFLA — cross-auth authorization tests
    const bolaFindings = await testBOLA(_target, _config, engine);
    findings.push(...bolaFindings);

    const bflaFindings = await testBFLA(_target, _config, engine);
    findings.push(...bflaFindings);

    return findings;
  }
}
