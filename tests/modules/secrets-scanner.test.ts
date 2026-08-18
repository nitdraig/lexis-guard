import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { SecretsScanner } from '../../src/modules/secrets-scanner.js';
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

describe('SecretsScanner', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/private') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJBAK...\n-----END RSA PRIVATE KEY-----');
        return;
      }
      if (req.url === '/apikey') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ api_key: 'abcdefghijklmnopqrstuvwxyz123456' }));
        return;
      }
      if (req.url === '/password') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ password: 'super-secret-value' }));
        return;
      }
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

  it('detects an exposed private key', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new SecretsScanner();
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, [{ method: 'GET', path: '/private' }]);
    expect(findings.some((f) => f.rule_id === 'PRIVATE_KEY_EXPOSED')).toBe(true);
    await engine.close();
  });

  it('detects an exposed API key', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new SecretsScanner();
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, [{ method: 'GET', path: '/apikey' }]);
    expect(findings.some((f) => f.rule_id === 'API_KEY_EXPOSED')).toBe(true);
    await engine.close();
  });

  it('detects an exposed password', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new SecretsScanner();
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, [{ method: 'GET', path: '/password' }]);
    expect(findings.some((f) => f.rule_id === 'PASSWORD_EXPOSED')).toBe(true);
    await engine.close();
  });
});
