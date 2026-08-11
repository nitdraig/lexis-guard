import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { SecurityModule } from '../../src/modules/security-module.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function stubConfig(): Lexisrc {
  return {
    scope: { allowed_targets: ['127.0.0.1'], environment: 'staging' },
    mode: 'safe',
    auth: {
      profiles: {
        a: { type: 'bearer', token: 't', role: 'standard', owns: ['r:1'] },
        b: { type: 'bearer', token: 't', role: 'standard', owns: ['r:2'] },
        admin: { type: 'bearer', token: 't', role: 'admin', owns: [] }
      }
    },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

describe('SecurityModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = req.url ?? '/';

      if (url === '/.env') {
        res.writeHead(200);
        res.end('SECRET=123');
        return;
      }

      if (url === '/.git/config') {
        res.writeHead(200);
        res.end('[core]');
        return;
      }

      // Default root — missing security headers intentionally
      res.writeHead(200, {
        'content-type': 'application/json',
        'server': 'nginx/1.18.0',
        'x-powered-by': 'Express',
        'access-control-allow-origin': '*'
      });
      res.end(JSON.stringify({ status: 'ok' }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('detects missing security headers', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);

    const ids = findings.map((f) => f.rule_id);
    expect(ids).toContain('MISSING_HSTS');
    expect(ids).toContain('MISSING_X_FRAME_OPTIONS');
    expect(ids).toContain('MISSING_X_CONTENT_TYPE_OPTIONS');
    expect(ids).toContain('MISSING_CSP');
    expect(ids).toContain('CORS_WILD_CARD');
    expect(ids).toContain('STACK_LEAK');

    await engine.close();
  });

  it('detects sensitive file exposure', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);

    const exposed = findings.filter((f) => f.rule_id === 'SENSITIVE_FILE_EXPOSURE');
    expect(exposed.length).toBeGreaterThanOrEqual(1);
    expect(exposed.some((f) => f.path === '/.env')).toBe(true);

    await engine.close();
  });
});
