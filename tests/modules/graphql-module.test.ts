import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { GraphQLModule } from '../../src/modules/graphql-module.js';
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
    plugins: {},
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

function introspectableResponse(): string {
  return JSON.stringify({
    data: {
      __schema: {
        queryType: { name: 'Query' },
        mutationType: { name: 'Mutation' },
        types: [
          { kind: 'OBJECT', name: 'Query', fields: [{ name: 'users' }] },
          { kind: 'OBJECT', name: 'Mutation', fields: [{ name: 'createUser' }] }
        ]
      }
    }
  });
}

describe('GraphQLModule', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/graphql' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          const parsed = JSON.parse(body || '{}') as { query?: string };
          if (parsed.query?.includes('__schema')) {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(introspectableResponse());
          } else if (parsed.query?.includes('__nonexistent_field__')) {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ errors: [{ message: 'Cannot query field "__nonexistent_field__". Did you mean "users"?' }] }));
          } else {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: {} }));
          }
        });
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

  it('detects enabled introspection', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new GraphQLModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'GRAPHQL_INTROSPECTION_ENABLED')).toBe(true);
    await engine.close();
  });

  it('detects field suggestion leak', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new GraphQLModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'GRAPHQL_FIELD_SUGGESTION')).toBe(true);
    await engine.close();
  });
});
