/**
 * Three-state circuit breaker with reversible Throttle.
 *
 * States:
 * - Normal:  100% concurrency.
 * - Throttle: 50% concurrency. Reverts to Normal if latency recovers.
 * - Abort:    Drain undici pool, reject new work, mark report incomplete.
 */
function createWindow(size) {
    return { samples: [], maxSize: size };
}
function pushSample(win, value) {
    win.samples.push(value);
    if (win.samples.length > win.maxSize) {
        win.samples.shift();
    }
}
function percentile(sorted, p) {
    if (sorted.length === 0)
        return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}
function calculateP95(win) {
    if (win.samples.length === 0)
        return 0;
    const sorted = [...win.samples].sort((a, b) => a - b);
    return percentile(sorted, 95);
}
export class ThrottleController {
    state = 'normal';
    currentConcurrency;
    baselineConcurrency;
    limits;
    window;
    baselineLatency = 0;
    throttleCount = 0;
    /** Minimum samples in throttle before abort can trigger. */
    minThrottleSamples = 10;
    constructor(limits) {
        this.limits = limits;
        this.baselineConcurrency = limits.maxConcurrent;
        this.currentConcurrency = limits.maxConcurrent;
        this.window = createWindow(limits.windowSize ?? 100);
    }
    getState() {
        return this.state;
    }
    getConcurrencyLimit() {
        return this.currentConcurrency;
    }
    /**
     * Feed a new latency sample into the window and recalculate state.
     */
    recordLatency(totalMs) {
        if (this.state === 'abort')
            return;
        pushSample(this.window, totalMs);
        // Establish baseline after first few samples in normal state
        if (this.state === 'normal' && this.baselineLatency === 0 && this.window.samples.length >= 10) {
            this.baselineLatency = calculateP95(this.window);
        }
        const p95 = calculateP95(this.window);
        if (this.state === 'normal') {
            if (p95 > this.limits.latencyThresholdMs) {
                this.state = 'throttle';
                this.throttleCount = 0;
                this.currentConcurrency = Math.max(1, Math.floor(this.baselineConcurrency * 0.5));
            }
        }
        else if (this.state === 'throttle') {
            if (p95 <= this.limits.latencyThresholdMs * 0.8) {
                // Recovered: revert to normal
                this.state = 'normal';
                this.throttleCount = 0;
                this.currentConcurrency = this.baselineConcurrency;
            }
            else {
                // Only count consecutive high-latency samples toward abort
                if (totalMs > this.limits.latencyThresholdMs * 0.8) {
                    this.throttleCount += 1;
                }
                else {
                    this.throttleCount = 0;
                }
                if (this.baselineLatency > 0 && this.throttleCount >= this.minThrottleSamples) {
                    const degradation = (p95 - this.baselineLatency) / this.baselineLatency;
                    if (degradation * 100 >= this.limits.abortOnDegradationPct) {
                        this.state = 'abort';
                        this.currentConcurrency = 0;
                    }
                }
            }
        }
    }
    /**
     * Mark as aborted externally (e.g., explicit signal or circuit breaker).
     */
    forceAbort() {
        this.state = 'abort';
        this.currentConcurrency = 0;
    }
    /**
     * Reset to normal state. Useful for testing or manual recovery.
     */
    reset() {
        this.state = 'normal';
        this.currentConcurrency = this.baselineConcurrency;
        this.window.samples = [];
        this.baselineLatency = 0;
        this.throttleCount = 0;
    }
}
//# sourceMappingURL=throttle.js.map