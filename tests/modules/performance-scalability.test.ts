import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { PerformanceModule } from '../../src/modules/performance-module.js';
import { ScalabilityModule } from '../../src/modules/scalability-module.js';
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

describe('PerformanceModule', () => {
  it('flags high latency', async () => {
    const server = createServer((_req, res) => {
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }, 2500);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 5000,
      abortOnDegradationPct: 1000
    });

    const mod = new PerformanceModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);

    expect(findings.some((f) => f.rule_id === 'HIGH_LATENCY' || f.rule_id === 'HIGH_TTFB')).toBe(true);

    await engine.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('flags large uncompressed payload', async () => {
    const server = createServer((_req, res) => {
      const body = JSON.stringify({ data: 'x'.repeat(60_000) });
      res.writeHead(200, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
        // intentionally no content-encoding
      });
      res.end(body);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new PerformanceModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);

    expect(findings.some((f) => f.rule_id === 'UNCOMPRESSED_LARGE_PAYLOAD')).toBe(true);

    await engine.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe('ScalabilityModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    let requestCount = 0;
    server = createServer((_req, res) => {
      requestCount += 1;
      if (requestCount > 15) {
        res.writeHead(503);
        res.end('overloaded');
        return;
      }
      res.writeHead(200);
      res.end('ok');
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

  it('detects rate limiting absence', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 10,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new ScalabilityModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);

    expect(findings.some((f) => f.rule_id === 'NO_RATE_LIMIT')).toBe(true);
    await engine.close();
  });

  it('detects soak test failures (aggressive mode only)', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 20,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const aggressiveConfig: Lexisrc = { ...stubConfig(), mode: 'aggressive' };
    const mod = new ScalabilityModule();
    const findings = await mod.run(baseUrl, aggressiveConfig, engine);

    expect(findings.some((f) => f.rule_id === 'SOAK_TEST_FAILURES')).toBe(true);
    await engine.close();
  });

  it('never runs soak in safe mode (Phase C gate)', async () => {
    // The server starts failing with 503 after request 15; if soak ran in
    // safe mode we would see SOAK_TEST_FAILURES. Safe mode must skip it.
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 20,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const safeConfig: Lexisrc = { ...stubConfig(), mode: 'safe' };
    const mod = new ScalabilityModule();
    const findings = await mod.run(baseUrl, safeConfig, engine);

    expect(findings.some((f) => f.rule_id === 'SOAK_TEST_FAILURES')).toBe(false);
    await engine.close();
  });
});
