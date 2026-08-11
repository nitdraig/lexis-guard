import { ThrottleController } from './throttle.js';
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
export declare class HttpEngine {
    private pool;
    private throttle;
    private limiter;
    private requestCount;
    constructor(options: HttpEngineOptions);
    getThrottleState(): ReturnType<ThrottleController['getState']>;
    /** Number of HTTP requests executed so far (including failed/timeouts). */
    getRequestCount(): number;
    /**
     * Execute an HTTP request with latency measurement.
     */
    fetch(path: string, method: string, headers?: Record<string, string>, body?: string): Promise<HttpResponse>;
    /**
     * Drain the undici pool and mark engine as aborted.
     */
    abort(): Promise<void>;
    /**
     * Graceful shutdown.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=http-engine.d.ts.map