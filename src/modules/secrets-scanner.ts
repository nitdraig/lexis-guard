import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { Sanitizer } from '../core/sanitizer.js';

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

const API_KEY_RE = /\b(?:api[-_]?key|token|secret|access[-_]?key|auth[-_]?token)\b[^\n]{0,40}[:=]\s*['"]?[A-Za-z0-9._~+/=-]{20,}['"]?/gi;
const PRIVATE_KEY_RE = /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/;
const PASSWORD_RE = /\b(?:password|passwd|pwd)\b[^\n]{0,40}[:=]\s*['"][^'"]{4,}['"]/gi;
const PLACEHOLDER_RE = /(REDACTED|example|changeme|placeholder|your[-_]?(?:api[-_]?key|token|secret)|xxxxxxxx|<[^>]+>)/i;

/**
 * Secrets/PII scanner — conservative regex detection of API keys,
 * private keys and passwords leaked in responses.
 * lexis: real PII (email, SSN, card numbers) is deferred; the current pass
 * covers credential-shaped material only, keeping false positives low.
 */
export class SecretsScanner implements AuditModule {
  readonly id = 'secrets';
  readonly name = 'Secrets/PII';

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

    const sanitizer = new Sanitizer(config.scope.allowed_targets);
    const targets = endpoints?.filter((e) => e.method === 'GET').slice(0, 3) ?? [{ method: 'GET', path: '/' }];

    for (const target of targets) {
      try {
        const resp = await engine.fetch(target.path, target.method);
        const body = resp.body;

        if (PRIVATE_KEY_RE.test(body) && !PLACEHOLDER_RE.test(body)) {
          const sanitized = sanitizer.sanitize(body.slice(body.indexOf('-----BEGIN'), body.indexOf('-----END') + 9));
          track(
            finding('PRIVATE_KEY_EXPOSED', target.method, target.path, 'Private key material exposed', 'critical',
              `Evidence: ${sanitized}`, 'CWE-321', 9.8)
          );
        }

        const apiKeyMatches = body.match(API_KEY_RE) ?? [];
        for (const match of apiKeyMatches) {
          if (!PLACEHOLDER_RE.test(match)) {
            const sanitized = sanitizer.sanitize(match);
            track(
              finding('API_KEY_EXPOSED', target.method, target.path, 'API key or token exposed', 'high',
                `Evidence: ${sanitized}`, 'CWE-798', 8.1)
            );
          }
        }

        const passwordMatches = body.match(PASSWORD_RE) ?? [];
        for (const match of passwordMatches) {
          if (!PLACEHOLDER_RE.test(match)) {
            const sanitized = sanitizer.sanitize(match);
            track(
              finding('PASSWORD_EXPOSED', target.method, target.path, 'Password exposed in response', 'high',
                `Evidence: ${sanitized}`, 'CWE-522', 7.5)
            );
          }
        }
      } catch {
        // lexis: ignore connection errors on secrets probes
      }
    }

    return findings;
  }
}
