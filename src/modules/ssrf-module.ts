import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
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

const URL_PARAM_NAMES = ['url', 'endpoint', 'redirect', 'callback', 'uri', 'target', 'link', 'webhook'];
const SSRF_PROBES = [
  'http://localhost',
  'http://127.0.0.1',
  'http://169.254.169.254/latest/meta-data/'
];

/**
 * SSRF detection — probes parameters that accept URLs. Gated behind escalation.
 */
export class SsrfModule implements AuditModule {
  readonly id = 'ssrf';
  readonly name = 'SSRF';
  readonly requiresEscalation = true;

  async run(
    _target: string,
    _config: Lexisrc,
    engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    const candidates = this.candidates(endpoints);

    for (const candidate of candidates) {
      // Control: a clearly external, non-internal URL to compare responses.
      let controlBody = '';
      try {
        const control = await engine.fetch(`${candidate.path}?${candidate.param}=https://example.com`, candidate.method);
        controlBody = control.body;
      } catch {
        // lexis: control request failing is not a finding
      }

      for (const probe of SSRF_PROBES) {
        const probePath = `${candidate.path}?${candidate.param}=${encodeURIComponent(probe)}`;
        try {
          const resp = await engine.fetch(probePath, candidate.method);
          const reflectsInternal = /meta-data|instance-id|iam\/security-credentials|localhost|127\.0\.0\.1|internal/i.test(resp.body);
          const success = resp.statusCode >= 200 && resp.statusCode < 300;
          const differsFromControl = resp.body !== controlBody;

          // lexis: only report on internal reflection, or a successful 2xx whose
          // body materially diverges from the external control. 4xx/5xx and
          // identical responses are noise, not SSRF.
          if (reflectsInternal || (success && differsFromControl)) {
            track(
              finding(
                'SSRF_INTERNAL_PROBE_REFLECTED',
                candidate.method,
                candidate.path,
                `SSRF: internal probe reflected through ${candidate.param}`,
                'high',
                `Probe ${probe} returned ${resp.statusCode} and internal/divergent content`,
                'CWE-918',
                8.1
              )
            );
            break;
          }
        } catch {
          // lexis: ignore connection errors on SSRF probes
        }
      }
    }

    return findings;
  }

  private candidates(endpoints?: Endpoint[]): Array<{ path: string; method: string; param: string }> {
    if (endpoints && endpoints.length > 0) {
      const candidates: Array<{ path: string; method: string; param: string }> = [];
      for (const ep of endpoints) {
        for (const param of URL_PARAM_NAMES) {
          // Prefer spec-declared query parameters named like a URL sink.
          const lowerPath = ep.path.toLowerCase();
          if (lowerPath.includes(param)) {
            candidates.push({ path: ep.path, method: ep.method, param });
            break;
          }
        }
      }
      return candidates.slice(0, 3);
    }
    // lexis: no spec -> conservative root heuristic
    return [{ path: '/', method: 'GET', param: 'url' }];
  }
}
