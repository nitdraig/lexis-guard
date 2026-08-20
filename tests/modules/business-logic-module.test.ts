import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { BusinessLogicModule } from '../../src/modules/business-logic-module.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function stubConfig(overrides?: Partial<Lexisrc>): Lexisrc {
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
    plugins: {},
    websocket: {},
    fuzzing: { wordlists: [], mutations: 5, max_cases: 100 },
    oauth: { scopes: [], pkce: false },
    compliance: { frameworks: [] },
    business_logic: { workflows: [], price_params: [] },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 },
    ...overrides
  };
}

describe('BusinessLogicModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/checkout') {
        res.writeHead(200);
        res.end('ok');
        return;
      }
      if (req.method === 'POST' && req.url === '/') {
        res.writeHead(200);
        res.end('ok');
        return;
      }
      res.writeHead(404);
      res.end('not found');
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

  it('flags workflow bypass when the final step accepts a direct call', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new BusinessLogicModule();
    const config = stubConfig({
      business_logic: { workflows: [{ name: 'checkout', steps: ['/cart', '/checkout'] }], price_params: [] }
    });
    const findings = await mod.run(baseUrl, config, engine);
    expect(findings.some((f) => f.rule_id === 'WORKFLOW_BYPASS')).toBe(true);
    await engine.close();
  });

  it('flags price manipulation when a zero value is accepted', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new BusinessLogicModule();
    const config = stubConfig({
      business_logic: { workflows: [], price_params: ['price'] }
    });
    const findings = await mod.run(baseUrl, config, engine);
    expect(findings.some((f) => f.rule_id === 'PRICE_MANIPULATION')).toBe(true);
    await engine.close();
  });
});
