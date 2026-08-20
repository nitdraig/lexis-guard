import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { runFuzz } from '../../src/fuzzing/fuzz-engine.js';
import { HttpEngine } from '../../src/core/http-engine.js';

describe('runFuzz', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = req.url ?? '';
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`echo: ${url}`);
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

  it('reflects mutated payloads as findings', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const result = await runFuzz(engine, '/search', 'GET', {
      seeds: ['hello'],
      mutations: 3,
      maxCases: 3
    });
    expect(result.casesExecuted).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.rule_id === 'FUZZ_REFLECTED_PAYLOAD')).toBe(true);
    await engine.close();
  });

  it('caps execution at maxCases', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const result = await runFuzz(engine, '/search', 'GET', {
      seeds: ['a', 'b', 'c', 'd'],
      mutations: 5,
      maxCases: 2
    });
    expect(result.casesExecuted).toBe(2);
    await engine.close();
  });
});
