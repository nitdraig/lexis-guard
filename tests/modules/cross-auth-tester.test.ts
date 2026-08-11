import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { testBOLA, testBFLA } from '../../src/modules/cross-auth-tester.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function stubConfig(): Lexisrc {
  return {
    scope: { allowed_targets: ['127.0.0.1'], environment: 'staging' },
    mode: 'safe',
    auth: {
      profiles: {
        user_a: { type: 'bearer', token: 'token-a', role: 'standard', owns: ['order:1001'] },
        user_b: { type: 'bearer', token: 'token-b', role: 'standard', owns: ['order:2001'] },
        admin: { type: 'bearer', token: 'token-admin', role: 'admin', owns: [] }
      }
    },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

describe('testBOLA', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const auth = req.headers.authorization ?? '';

      // Simulate BOLA: user_a can access user_b's order (vulnerable)
      if (req.url === '/orders/2001' && auth.includes('token-a')) {
        res.writeHead(200);
        res.end(JSON.stringify({ order_id: 2001, owner: 'user_b' }));
        return;
      }

      // Normal access: user_a sees their own order
      if (req.url === '/orders/1001' && auth.includes('token-a')) {
        res.writeHead(200);
        res.end(JSON.stringify({ order_id: 1001, owner: 'user_a' }));
        return;
      }

      // user_b sees their own order
      if (req.url === '/orders/2001' && auth.includes('token-b')) {
        res.writeHead(200);
        res.end(JSON.stringify({ order_id: 2001, owner: 'user_b' }));
        return;
      }

      res.writeHead(404);
      res.end('not found');
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

  it('detects BOLA when user_a accesses user_b resource', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const findings = await testBOLA(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'BOLA_ACCESS_CROSS_USER')).toBe(true);
    expect(findings[0].severity).toBe('high');

    await engine.close();
  });
});

describe('testBFLA', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const auth = req.headers.authorization ?? '';

      // Simulate BFLA: standard user can access admin endpoint (vulnerable)
      if (req.url?.startsWith('/admin/') && auth.includes('token-a')) {
        res.writeHead(200);
        res.end(JSON.stringify({ admin: true }));
        return;
      }

      // Admin access works
      if (req.url?.startsWith('/admin/') && auth.includes('token-admin')) {
        res.writeHead(200);
        res.end(JSON.stringify({ admin: true }));
        return;
      }

      res.writeHead(403);
      res.end('forbidden');
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

  it('detects BFLA when standard user accesses admin endpoint', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const findings = await testBFLA(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'BFLA_ADMIN_ACCESS')).toBe(true);
    expect(findings[0].severity).toBe('critical');

    await engine.close();
  });
});
