import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { ContractModule } from '../../src/modules/contract-module.js';
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

describe('ContractModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/user') {
        // Returns id as string, but the schema declares it as number
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'abc' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 1 }));
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

  it('reports a response that violates the declared schema', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new ContractModule();
    const endpoints = [
      {
        method: 'GET',
        path: '/user',
        responseSchema: { type: 'object', required: ['id'], properties: { id: { type: 'number' } } }
      }
    ];
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, endpoints);
    expect(findings.some((f) => f.rule_id === 'SCHEMA_CONTRACT_VIOLATION')).toBe(true);
    await engine.close();
  });
});
