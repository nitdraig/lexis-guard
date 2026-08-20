import { describe, it, expect } from 'vitest';
import { runAuditPipeline } from '../../src/core/audit-pipeline.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';
import type { Finding } from '../../src/types/finding.js';
import { generateFindingHash } from '../../src/utils/finding-hash.js';

function makeConfig(): Lexisrc {
  return {
    scope: { allowed_targets: ['api.empresa.com'], environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
    auth: {
      profiles: {
        a: { type: 'bearer', token: 't', role: 'standard', owns: ['r:1'] },
        b: { type: 'bearer', token: 't', role: 'standard', owns: ['r:2'] },
        admin: { type: 'bearer', token: 't', role: 'admin', owns: [] }
      }
    },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false, model: 'm', api_key: '' },
    plugins: {},
    websocket: {},
    fuzzing: { wordlists: [], mutations: 5, max_cases: 100 },
    oauth: { scopes: [], pkce: false },
    compliance: { frameworks: [] },
    business_logic: { workflows: [], price_params: [] },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

function finding(ruleId: string, path: string, severity: Finding['severity'], evidence: string): Finding {
  return {
    hash: generateFindingHash(ruleId, path, 'GET'),
    rule_id: ruleId,
    method: 'GET',
    path,
    description: `${ruleId} on ${path}`,
    severity,
    evidence
  };
}

describe('runAuditPipeline', () => {
  it('deduplicates and sanitizes findings', async () => {
    const config = makeConfig();
    const result = await runAuditPipeline({
      findings: [
        finding('MISSING_HSTS', '/', 'medium', 'Request to api.empresa.com lacks HSTS'),
        // duplicate hash (same rule + path + method), worse severity
        {
          ...finding('MISSING_HSTS', '/', 'high', 'Request to api.empresa.com lacks HSTS'),
          hash: generateFindingHash('MISSING_HSTS', '/', 'GET')
        }
      ],
      config,
      target: 'https://api.empresa.com',
      durationMs: 1000
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].count).toBe(2);
    expect(result.findings[0].worst_case).toBe('high');
    expect(result.findings[0].evidence).toContain('TARGET_REDACTED_01');
    expect(result.findings[0].evidence).not.toContain('api.empresa.com');
  });

  it('applies lexisignore suppressions', async () => {
    const config = makeConfig();
    const ignored = finding('MISSING_HSTS', '/', 'high', 'api.empresa.com evidence');

    const result = await runAuditPipeline({
      findings: [ignored, finding('CORS_WILD_CARD', '/', 'high', 'api.empresa.com cors')],
      config,
      target: 'https://api.empresa.com',
      durationMs: 100,
      lexisignore: {
        ignore: [
          {
            hash: ignored.hash,
            rule_id: 'MISSING_HSTS',
            path: '/',
            method: 'GET',
            reason: 'known baseline',
            approved_by: 'owner@empresa.com',
            expires: '2999-01-01T00:00:00Z'
          }
        ]
      }
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].rule_id).toBe('CORS_WILD_CARD');
    expect(result.suppressed).toHaveLength(1);
    expect(result.suppressed[0].rule_id).toBe('MISSING_HSTS');
  });

  it('returns null synthesis without ai config', async () => {
    const result = await runAuditPipeline({
      findings: [finding('MISSING_HSTS', '/', 'medium', 'api.empresa.com')],
      config: makeConfig(),
      target: 'https://api.empresa.com',
      durationMs: 100
    });

    expect(result.synthesis).toBeNull();
    expect(result.meta.target).toBe('https://api.empresa.com');
    expect(result.meta.mode).toBe('safe');
    expect(result.meta.incomplete).toBe(false);
  });

  it('runs AI synthesis when ai config is provided (deterministic stub)', async () => {
    const config = makeConfig();
    const result = await runAuditPipeline({
      findings: [
        finding('MISSING_HSTS', '/', 'medium', 'api.empresa.com'),
        finding('CORS_WILD_CARD', '/', 'high', 'api.empresa.com')
      ],
      config,
      target: 'https://api.empresa.com',
      durationMs: 100,
      ai: config.ai
    });

    expect(result.synthesis).not.toBeNull();
    expect(result.synthesis?.overall_posture).toBe('needs_attention');
  });

  it('marks incomplete audits in meta', async () => {
    const result = await runAuditPipeline({
      findings: [],
      config: makeConfig(),
      target: 'https://api.empresa.com',
      durationMs: 100,
      incomplete: true
    });

    expect(result.meta.incomplete).toBe(true);
  });
});