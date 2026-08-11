import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
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

/**
 * Performance audit module — latency, payload, protocol support.
 */
export class PerformanceModule implements AuditModule {
  readonly id = 'performance';
  readonly name = 'Performance';

  async run(target: string, _config: Lexisrc, engine: HttpEngine, onFinding?: (f: Finding) => void): Promise<Finding[]> {
    const findings: Finding[] = [];
    // Stream each finding to the UI the moment it is detected.
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    // 1. Baseline latency on root
    const resp = await engine.fetch('/', 'GET');
    const { latency } = resp;

    if (latency.total > 2000) {
      track(
        finding('HIGH_LATENCY', 'GET', '/', 'Total response time exceeds 2s', 'medium',
          `Total: ${latency.total.toFixed(0)}ms, TTFB: ${latency.ttfb.toFixed(0)}ms`, undefined, 4.0)
      );
    }

    if (latency.ttfb > 1000) {
      track(
        finding('HIGH_TTFB', 'GET', '/', 'Time to first byte exceeds 1s', 'medium',
          `TTFB: ${latency.ttfb.toFixed(0)}ms`, undefined, 4.0)
      );
    }

    // 2. Payload efficiency: detect large JSON without compression
    const contentLength = parseInt(
      (resp.headers['content-length'] as string) ?? '0',
      10
    );
    const contentEncoding = (resp.headers['content-encoding'] as string) ?? '';

    if (contentLength > 50_000 && !contentEncoding) {
      track(
        finding('UNCOMPRESSED_LARGE_PAYLOAD', 'GET', '/', 'Large response not compressed', 'low',
          `Content-Length: ${contentLength} bytes, no Content-Encoding`, undefined, 3.0)
      );
    }

    // 3. HTTP/2 support probe (simple)
    // lexis: undici auto-negotiates HTTP/2 with connect({ protocol: 'https:' })
    // We flag if target uses HTTP/1.1 only on HTTPS.
    if (target.startsWith('https://')) {
      const via = (resp.headers['via'] as string) ?? '';
      if (via.includes('1.1')) {
        track(
          finding('HTTP2_NOT_SUPPORTED', 'GET', '/', 'HTTP/2 not detected', 'info',
            'Server responded via HTTP/1.1', undefined, 1.0)
        );
      }
    }

    return findings;
  }
}
