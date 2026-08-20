import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { GrpcModule } from '../../src/modules/grpc-module.js';
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
    websocket: {},
    limits: { max_concurrent_requests: 20, max_requests_per_test: 500, abort_on_latency_degradation_pct: 40 }
  };
}

const HEALTH_CHECK_PATH = '/grpc.health.v1.Health/Check';

function healthServiceDefinition(): grpc.ServiceDefinition {
  return {
    Check: {
      path: HEALTH_CHECK_PATH,
      requestStream: false,
      responseStream: false,
      requestSerialize: (v: unknown) => Buffer.from([0x0a, 0]), // empty service
      requestDeserialize: () => ({}),
      responseSerialize: (v: unknown) => {
        const value = (v as { status?: string }).status === 'SERVING' ? 1 : 0;
        return Buffer.from([0x08, value]);
      },
      responseDeserialize: () => ({ status: 'SERVING' })
    }
  };
}

describe('GrpcModule', () => {
  let server: grpc.Server;
  let address: string;

  beforeAll(async () => {
    server = new grpc.Server();
    server.addService(healthServiceDefinition(), {
      Check: (_call: unknown, callback: (err: null, response: { status: string }) => void) => {
        callback(null, { status: 'SERVING' });
      }
    });

    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });
    address = `127.0.0.1:${port}`;
  });

  afterAll(() => {
    server.forceShutdown();
  });

  it('detects an accessible insecure health service', async () => {
    const engine = new HttpEngine({ baseUrl: `http://${address}`, concurrency: 5, latencyThresholdMs: 1000, abortOnDegradationPct: 40 });
    const mod = new GrpcModule();
    const findings = await mod.run(`http://${address}`, stubConfig(), engine);
    expect(findings.some((f) => f.rule_id === 'GRPC_INSECURE_HEALTH_ACCESSIBLE')).toBe(true);
    await engine.close();
  });
});
