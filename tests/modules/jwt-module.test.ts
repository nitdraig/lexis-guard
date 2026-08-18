import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { JwtModule } from '../../src/modules/jwt-module.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';
import { createHmac } from 'node:crypto';

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function jwtWith(header: object, payload: object, secret: string): string {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function stubConfig(): Lexisrc {
  return {
    scope: { allowed_targets: ['127.0.0.1'], environment: 'staging' },
    mode: 'safe',
    profile: 'deep',
    auth: {
      profiles: {
        a: { type: 'bearer', token: 'not-a-jwt', role: 'standard', owns: ['r:1'] },
        b: { type: 'bearer', token: 'not-a-jwt', role: 'standard', owns: ['r:2'] },
        admin: { type: 'bearer', token: 'not-a-jwt', role: 'admin', owns: [] }
      }
    },
    ai: { provider: 'anthropic', redact_target: true, local_fallback: false },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

const VALID_JWT = jwtWith({ alg: 'HS256', typ: 'JWT' }, { sub: 'admin', role: 'admin' }, 'real-secret');

describe('JwtModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const auth = req.headers.authorization ?? '';
      const token = auth.replace(/^Bearer\s+/, '');

      // alg:none accepted (vulnerable)
      if (token.endsWith('.')) {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // weak secret accepted
      if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadRaw = Buffer.from(parts[1], 'base64url').toString('utf-8');
          try {
            const payload = JSON.parse(payloadRaw);
            if (payload.sub === 'admin') {
              // Accept the well-known weak secret "secret"
              const expected = jwtWith({ alg: 'HS256', typ: 'JWT' }, payload, 'secret');
              if (token === expected) {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true }));
                return;
              }
            }
          } catch {}
        }
      }

      res.writeHead(401);
      res.end('unauthorized');
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

  it('detects alg:none acceptance', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new JwtModule();

    // Config token must be a JWT so the module can discover it.
    const config = stubConfig();
    config.auth.profiles.a.token = VALID_JWT;

    const findings = await mod.run(baseUrl, config, engine);
    expect(findings.some((f) => f.rule_id === 'JWT_ALG_NONE_ACCEPTED')).toBe(true);
    await engine.close();
  });

  it('detects a weak HMAC secret', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new JwtModule();

    const config = stubConfig();
    config.auth.profiles.a.token = VALID_JWT;

    const findings = await mod.run(baseUrl, config, engine);
    expect(findings.some((f) => f.rule_id === 'JWT_WEAK_SECRET')).toBe(true);
    await engine.close();
  });
});

describe('JwtModule — no false positive', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((_req, res) => {
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

  it('does not report a generic 2xx that matches the unauthenticated baseline', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new JwtModule();

    const config = stubConfig();
    config.auth.profiles.a.token = VALID_JWT;

    const findings = await mod.run(baseUrl, config, engine);
    expect(findings).toHaveLength(0);
    await engine.close();
  });
});
