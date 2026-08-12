import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { SecurityModule } from '../../src/modules/security-module.js';
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

  it('quick profile skips cross-auth (BOLA/BFLA) checks', async () => {
    // Server 200s every path by default, so in the deep profile BOLA fires
    // (user_a reaches /rs/1 of user_b). Quick profile must not run BOLA/BFLA.
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const deepConfig: Lexisrc = { ...stubConfig(), profile: 'deep' };
    const deepMod = new SecurityModule();
    const deepFindings = await deepMod.run(baseUrl, deepConfig, engine);
    expect(deepFindings.map((f) => f.rule_id)).toContain('BOLA_ACCESS_CROSS_USER');

    const quickConfig: Lexisrc = { ...stubConfig(), profile: 'quick' };
    const quickMod = new SecurityModule();
    const quickFindings = await quickMod.run(baseUrl, quickConfig, engine);

    const ids = quickFindings.map((f) => f.rule_id);
    expect(ids).not.toContain('BOLA_ACCESS_CROSS_USER');
    expect(ids).not.toContain('BFLA_ADMIN_ACCESS');

    await engine.close();
  });

  it('detects data exposure in JSON responses (deep profile)', async () => {
    const srv = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ user: { password: 'secret123' } }));
    });

    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const addr = srv.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl: url,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const findings = await mod.run(url, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'DATA_EXPOSURE')).toBe(true);

    await engine.close();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('does not flag data exposure on non-JSON responses', async () => {
    const srv = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('password=secret123');
    });

    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const addr = srv.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl: url,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const findings = await mod.run(url, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'DATA_EXPOSURE')).toBe(false);

    await engine.close();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('does not flag TLS downgrade on HTTP targets', async () => {
    // Existing server is HTTP; TLS checks should only fire on HTTPS targets.
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'TLS_DOWNGRADE')).toBe(false);

    await engine.close();
  });

  it('detects broken auth on unauthenticated mutating endpoints from spec', async () => {
    const srv = createServer((req, res) => {
      if (req.url === '/users' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 1 }));
        return;
      }
      res.writeHead(200);
      res.end('ok');
    });

    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const addr = srv.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl: url,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const endpoints = [{ method: 'POST', path: '/users' }];
    const findings = await mod.run(url, stubConfig(), engine, undefined, endpoints);
    expect(findings.some((f) => f.rule_id === 'BROKEN_AUTH' && f.path === '/users')).toBe(true);

    await engine.close();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('ignores 401/403 on broken-auth probes (not a finding)', async () => {
    const srv = createServer((req, res) => {
      if (req.url === '/users' && req.method === 'POST') {
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      res.writeHead(200);
      res.end('ok');
    });

    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const addr = srv.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl: url,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const mod = new SecurityModule();
    const endpoints = [{ method: 'POST', path: '/users' }];
    const findings = await mod.run(url, stubConfig(), engine, undefined, endpoints);
    expect(findings.some((f) => f.rule_id === 'BROKEN_AUTH')).toBe(false);

    await engine.close();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('detects mass assignment in aggressive mode', async () => {
    const srv = createServer((req, res) => {
      if (req.url === '/users' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 1 }));
        return;
      }
      res.writeHead(200);
      res.end('ok');
    });

    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const addr = srv.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl: url,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const aggressiveConfig: Lexisrc = { ...stubConfig(), mode: 'aggressive' };
    const mod = new SecurityModule();
    const endpoints = [{ method: 'POST', path: '/users' }];
    const findings = await mod.run(url, aggressiveConfig, engine, undefined, endpoints);
    expect(findings.some((f) => f.rule_id === 'MASS_ASSIGNMENT' && f.path === '/users')).toBe(true);

    await engine.close();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('skips mass assignment in safe mode', async () => {
    const srv = createServer((req, res) => {
      if (req.url === '/users' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 1 }));
        return;
      }
      res.writeHead(200);
      res.end('ok');
    });

    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const addr = srv.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    const engine = new HttpEngine({
      baseUrl: url,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const safeConfig: Lexisrc = { ...stubConfig(), mode: 'safe' };
    const mod = new SecurityModule();
    const endpoints = [{ method: 'POST', path: '/users' }];
    const findings = await mod.run(url, safeConfig, engine, undefined, endpoints);
    expect(findings.some((f) => f.rule_id === 'MASS_ASSIGNMENT')).toBe(false);

    await engine.close();
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });
});
