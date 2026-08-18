import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { SsrfModule } from '../../src/modules/ssrf-module.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function stubConfig(): Lexisrc {
  return {
    scope: { allowed_targets: ['127.0.0.1'], environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
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

describe('SsrfModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (url.pathname === '/fetch' && url.searchParams.get('url')) {
        const target = url.searchParams.get('url') ?? '';
        // Vulnerable: reflects internal metadata content
        if (target.includes('169.254.169.254')) {
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end('instance-id: i-12345');
          return;
        }
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('ok');
        return;
      }

      res.writeHead(200);
      res.end('ok');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('detects internal metadata reflected through a URL parameter', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new SsrfModule();
    const endpoints = [{ method: 'GET', path: '/fetch?url=https://example.com' }];
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, endpoints);
    expect(findings.some((f) => f.rule_id === 'SSRF_INTERNAL_PROBE_REFLECTED')).toBe(true);
    await engine.close();
  });
});

describe('SsrfModule — no false positive', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('does not report when every probe returns an identical benign response', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new SsrfModule();
    const endpoints = [{ method: 'GET', path: '/fetch?url=https://example.com' }];
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, endpoints);
    expect(findings).toHaveLength(0);
    await engine.close();
  });
});
