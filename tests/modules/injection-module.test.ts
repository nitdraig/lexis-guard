import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { InjectionModule } from '../../src/modules/injection-module.js';
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

describe('InjectionModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = (req.url ?? '/').toLowerCase();

      if (url.includes('etc%2fpasswd') || url.includes('etc/passwd')) {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('root:x:0:0:root:/root:/bin/bash');
        return;
      }

      if (url.includes('%7b%22%24ne%22')) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'MongoServerError: $ne is not allowed' }));
        return;
      }

      // Boolean-based: true and false predicates produce clearly different bodies.
      if (url.includes('and%201%3d1')) {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('a'.repeat(100));
        return;
      }
      if (url.includes('and%201%3d2')) {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('a');
        return;
      }

      // Command injection: response reflects uid/gid/groups.
      if (url.includes('%3b%20id') || url.includes('%7c%20id') || url.includes('%60id%60')) {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('uid=0(root) gid=0(root) groups=0(root)');
        return;
      }

      if (url.includes("'") || url.includes('%22%20or%201%3d1%20--')) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('SQL syntax error: unclosed quotation');
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

  it('detects SQLi error-based injection', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new InjectionModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'SQLI_ERROR_BASED')).toBe(true);
    await engine.close();
  });

  it('detects NoSQLi injection', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new InjectionModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'NOSQL_INJECTION')).toBe(true);
    await engine.close();
  });

  it('detects path traversal', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new InjectionModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine, undefined, [{ method: 'GET', path: '/files/{file}' }]);
    expect(findings.some((f) => f.rule_id === 'PATH_TRAVERSAL')).toBe(true);
    await engine.close();
  });

  it('detects boolean-based SQLi', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new InjectionModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'SQLI_BLIND_BOOLEAN')).toBe(true);
    await engine.close();
  });

  it('detects command injection', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new InjectionModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'COMMAND_INJECTION')).toBe(true);
    await engine.close();
  });
});
