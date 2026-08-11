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
  private requestCount = 0;

  constructor(options: HttpEngineOptions) {
    // lexis: targets may be hostname-only (as stored in .lexisrc) — normalize scheme to https
    const baseUrl = /^https?:\/\//i.test(options.baseUrl) ? options.baseUrl : `https://${options.baseUrl}`;
    this.pool = new Pool(baseUrl, {
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

  /** Number of HTTP requests executed so far (including failed/timeouts). */
  getRequestCount(): number {
    return this.requestCount;
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
      this.requestCount += 1;
      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const t0 = performance.now();

        const response = await this.pool.request({
          path,
          method: method as Dispatcher.HttpMethod,
          headers,
          body: body ? Buffer.from(body) : undefined,
          signal: controller.signal
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
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
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
