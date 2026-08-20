import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { WebSocketModule } from '../../src/modules/websocket-module.js';
import { HttpEngine } from '../../src/core/http-engine.js';
import type { Lexisrc } from '../../src/config/lexisrc-schema.js';

function stubConfig(endpoint?: string): Lexisrc {
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
    websocket: { endpoint },
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

describe('WebSocketModule', () => {
  let httpServer: Server;
  let wss: WebSocketServer;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (socket) => {
      socket.on('message', () => socket.send('pong'));
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        const addr = httpServer.address();
        if (addr && typeof addr === 'object') baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    wss.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('flags an unauthenticated handshake when no auth is enforced', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new WebSocketModule();
    const findings = await mod.run(baseUrl, stubConfig('/socket'), engine);
    expect(findings.some((f) => f.rule_id === 'WEBSOCKET_UNAUTHENTICATED_HANDSHAKE')).toBe(true);
    await engine.close();
  });

  it('produces no findings when no endpoint is configured', async () => {
    const engine = new HttpEngine({ baseUrl, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new WebSocketModule();
    const findings = await mod.run(baseUrl, stubConfig(), engine);
    expect(findings).toHaveLength(0);
    await engine.close();
  });
});
