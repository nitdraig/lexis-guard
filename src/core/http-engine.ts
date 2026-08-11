import { Pool, type Dispatcher } from 'undici';
import pLimit from 'p-limit';
import { ThrottleController, type ThrottleLimits } from './throttle.js';

export interface LatencyBreakdown {
  dns?: number;
  tcp?: number;
  tls?: number;
  ttfb: number;
  total: number;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
  latency: LatencyBreakdown;
}

export interface HttpEngineOptions {
  baseUrl: string;
  concurrency: number;
  latencyThresholdMs: number;
  abortOnDegradationPct: number;
}

/**
 * Deterministic HTTP engine using undici with concurrency control
 * and reversible Throttle state.
 */
export class HttpEngine {
  private pool: Pool;
  private throttle: ThrottleController;
  private limiter: ReturnType<typeof pLimit>;

  constructor(options: HttpEngineOptions) {
    this.pool = new Pool(options.baseUrl, {
      connections: options.concurrency,
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 60000
    });

    const throttleLimits: ThrottleLimits = {
      maxConcurrent: options.concurrency,
      latencyThresholdMs: options.latencyThresholdMs,
      abortOnDegradationPct: options.abortOnDegradationPct
    };

    this.throttle = new ThrottleController(throttleLimits);
    this.limiter = pLimit(options.concurrency);
  }

  getThrottleState(): ReturnType<ThrottleController['getState']> {
    return this.throttle.getState();
  }

  /**
   * Execute an HTTP request with latency measurement.
   */
  async fetch(
    path: string,
    method: string,
    headers?: Record<string, string>,
    body?: string
  ): Promise<HttpResponse> {
    if (this.throttle.getState() === 'abort') {
      throw new Error('Engine aborted: circuit breaker open');
    }

    return this.limiter(async () => {
      const t0 = performance.now();

      const response = await this.pool.request({
        path,
        method: method as Dispatcher.HttpMethod,
        headers,
        body: body ? Buffer.from(body) : undefined
      }) as Dispatcher.ResponseData;

      const t1 = performance.now();

      const chunks: Buffer[] = [];
      for await (const chunk of response.body) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');

      const t2 = performance.now();

      const total = t2 - t0;
      const ttfb = t1 - t0;

      this.throttle.recordLatency(total);

      // lexis: coarse-grained timings; undici does not expose DNS/TCP/TLS
      // individually without custom connect timing. Upgrade if needed.
      const latency: LatencyBreakdown = {
        ttfb,
        total
      };

      return {
        statusCode: response.statusCode,
        headers: response.headers as Record<string, string | string[]>,
        body: rawBody,
        latency
      };
    });
  }

  /**
   * Drain the undici pool and mark engine as aborted.
   */
  async abort(): Promise<void> {
    this.throttle.forceAbort();
    await this.pool.close();
  }

  /**
   * Graceful shutdown.
   */
  async close(): Promise<void> {
    await this.pool.close();
  }
}
