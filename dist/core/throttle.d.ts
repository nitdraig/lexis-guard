/**
 * Three-state circuit breaker with reversible Throttle.
 *
 * States:
 * - Normal:  100% concurrency.
 * - Throttle: 50% concurrency. Reverts to Normal if latency recovers.
 * - Abort:    Drain undici pool, reject new work, mark report incomplete.
 */
export type ThrottleState = 'normal' | 'throttle' | 'abort';
export interface ThrottleLimits {
    maxConcurrent: number;
    /** Latency p95 threshold in ms to trigger Throttle. */
    latencyThresholdMs: number;
    /** Percentage above baseline to trigger Abort. */
    abortOnDegradationPct: number;
    /** Sliding window size for p95 calculation. Default 100. */
    windowSize?: number;
}
export declare class ThrottleController {
    private state;
    private currentConcurrency;
    private readonly baselineConcurrency;
    private readonly limits;
    private readonly window;
    private baselineLatency;
    private throttleCount;
    /** Minimum samples in throttle before abort can trigger. */
    private readonly minThrottleSamples;
    constructor(limits: ThrottleLimits);
    getState(): ThrottleState;
    getConcurrencyLimit(): number;
    /**
     * Feed a new latency sample into the window and recalculate state.
     */
    recordLatency(totalMs: number): void;
    /**
     * Mark as aborted externally (e.g., explicit signal or circuit breaker).
     */
    forceAbort(): void;
    /**
     * Reset to normal state. Useful for testing or manual recovery.
     */
    reset(): void;
}
//# sourceMappingURL=throttle.d.ts.map