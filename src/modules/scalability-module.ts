import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import { generateFindingHash } from '../utils/finding-hash.js';
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

/**
 * Scalability audit module — rate limiting detection and soak test.
 */
export class ScalabilityModule implements AuditModule {
  readonly id = 'scalability';
  readonly name = 'Scalability';

  async run(_target: string, config: Lexisrc, engine: HttpEngine, onFinding?: (f: Finding) => void): Promise<Finding[]> {
    const findings: Finding[] = [];
    // Stream each finding to the UI the moment it is detected.
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };
    const maxRequests = config.limits.max_requests_per_test;

    // 1. Rate limiting detection: burst 10 rapid requests
    const burstSize = 10;
    const responses: number[] = [];

    for (let i = 0; i < burstSize; i++) {
      try {
        const resp = await engine.fetch('/', 'GET');
        responses.push(resp.statusCode);
      } catch {
        responses.push(0);
      }
    }

    const profile = resolveProfile(config.profile);
    if (profile.checks.includes('rate_limit')) {
      const rateLimited = responses.filter((s) => s === 429).length;
      if (rateLimited === 0) {
        track(
          finding('NO_RATE_LIMIT', 'GET', '/', 'No rate limiting detected on burst', 'medium',
            `Burst of ${burstSize} requests: no 429 responses`, 'CWE-770', 5.3)
        );
      } else {
        track(
          finding('RATE_LIMIT_DETECTED', 'GET', '/', 'Rate limiting present', 'info',
            `${rateLimited}/${burstSize} requests returned 429`, undefined, 1.0)
        );
      }
    }

    // 2. Soak test: sustained load up to max_requests_per_test / 4
    // lexis: conservative soak to avoid overwhelming the target
    // Aggressive mode + deep profile only — safe mode never runs sustained load.
    const allowSoak = config.mode === 'aggressive' && profile.checks.includes('soak_test');
    if (allowSoak) {
      const soakRequests = Math.min(20, Math.floor(maxRequests / 4));
      const soakStatuses: number[] = [];

      for (let i = 0; i < soakRequests; i++) {
        try {
          const resp = await engine.fetch('/', 'GET');
          soakStatuses.push(resp.statusCode);
        } catch {
          soakStatuses.push(0);
        }
      }

      const errors = soakStatuses.filter((s) => s >= 500 || s === 0).length;
      if (errors > 0) {
        track(
          finding('SOAK_TEST_FAILURES', 'GET', '/', 'Errors during sustained load', 'high',
            `${errors}/${soakRequests} requests failed (5xx or timeout)`, 'CWE-400', 6.5)
        );
      }
    }

    // 3. Throttle state observation
    const state = engine.getThrottleState();
    if (state === 'throttle') {
      track(
        finding('LATENCY_THROTTLE_TRIGGERED', 'GET', '/', 'Engine throttled due to latency', 'medium',
          'ThrottleController switched to throttle state', undefined, 4.0)
      );
    } else if (state === 'abort') {
      track(
        finding('CIRCUIT_BREAKER_ABORTED', 'GET', '/', 'Circuit breaker aborted the test', 'critical',
          'ThrottleController switched to abort state — partial report', undefined, 8.0)
      );
    }

    return findings;
  }
}
