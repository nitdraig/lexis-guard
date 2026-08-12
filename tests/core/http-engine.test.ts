import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { HttpEngine } from '../../src/core/http-engine.js';

describe('HttpEngine', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const delay = req.headers['x-delay'] ? parseInt(req.headers['x-delay'] as string, 10) : 0;
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ path: req.url, method: req.method }));
      }, delay);
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

  it('fetches a simple GET and measures latency', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const response = await engine.fetch('/test', 'GET');
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ path: '/test', method: 'GET' });
    expect(response.latency.total).toBeGreaterThanOrEqual(0);
    expect(response.latency.ttfb).toBeGreaterThanOrEqual(0);
    expect(engine.getRequestCount()).toBe(1);

    await engine.close();
  });

  it('accepts a hostname-only baseUrl (normalized to https)', async () => {
    const engine = new HttpEngine({
      baseUrl: 'example.com',
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    expect(engine.getThrottleState()).toBe('normal');
    await engine.close();
  });

  it('sends custom headers', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    const response = await engine.fetch('/headers', 'GET', { 'X-Custom': 'value' });
    expect(response.statusCode).toBe(200);
    await engine.close();
  });

  it('transitions to throttle under high latency', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 10,
      latencyThresholdMs: 50,
      abortOnDegradationPct: 1000 // extremely high so we only test throttle
    });

    // Baseline fast requests
    for (let i = 0; i < 12; i++) {
      await engine.fetch('/fast', 'GET');
    }
    expect(engine.getThrottleState()).toBe('normal');

    // Slow requests to trigger throttle (keep below minThrottleSamples to avoid abort)
    for (let i = 0; i < 9; i++) {
      await engine.fetch('/slow', 'GET', { 'x-delay': '100' });
    }
    expect(engine.getThrottleState()).toBe('throttle');

    await engine.close();
  });

  it('rejects new work after abort', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });

    await engine.abort();
    await expect(engine.fetch('/test', 'GET')).rejects.toThrow('Engine aborted');
  });

  it('throttle reduces the concurrency limit (Phase C)', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 10,
      latencyThresholdMs: 50,
      abortOnDegradationPct: 1000 // no abort, only throttle
    });

    expect(engine.getConcurrencyLimit()).toBe(10);

    // Slow requests push p95 over the threshold -> throttle halves concurrency.
    for (let i = 0; i < 9; i++) {
      await engine.fetch('/slow', 'GET', { 'x-delay': '100' });
    }
    expect(engine.getThrottleState()).toBe('throttle');
    expect(engine.getConcurrencyLimit()).toBe(5);

    // The active limiter is recreated at the reduced limit; new requests use it.
    const response = await engine.fetch('/after-throttle', 'GET');
    expect(response.statusCode).toBe(200);

    await engine.close();
  });

  it('enforces max_requests_per_test as a hard ceiling', async () => {
    const engine = new HttpEngine({
      baseUrl,
      concurrency: 5,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40,
      maxRequests: 2
    });

    expect((await engine.fetch('/a', 'GET')).statusCode).toBe(200);
    expect((await engine.fetch('/b', 'GET')).statusCode).toBe(200);
    await expect(engine.fetch('/c', 'GET')).rejects.toThrow('max_requests_per_test reached');
    expect(engine.getRequestCount()).toBe(2);

    await engine.close();
  });
});
