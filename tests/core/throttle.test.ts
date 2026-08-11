import { describe, it, expect } from 'vitest';
import { ThrottleController } from '../../src/core/throttle.js';

describe('ThrottleController', () => {
  it('starts in normal state', () => {
    const t = new ThrottleController({
      maxConcurrent: 20,
      latencyThresholdMs: 1000,
      abortOnDegradationPct: 40
    });
    expect(t.getState()).toBe('normal');
    expect(t.getConcurrencyLimit()).toBe(20);
  });

  it('switches to throttle when p95 exceeds threshold', () => {
    const t = new ThrottleController({
      maxConcurrent: 20,
      latencyThresholdMs: 100,
      abortOnDegradationPct: 40,
      windowSize: 20
    });

    // Feed 10 samples below threshold to establish baseline
    for (let i = 0; i < 10; i++) {
      t.recordLatency(50);
    }
    expect(t.getState()).toBe('normal');

    // Feed high latency (keep count low to avoid abort)
    for (let i = 0; i < 2; i++) {
      t.recordLatency(200);
    }
    expect(t.getState()).toBe('throttle');
    expect(t.getConcurrencyLimit()).toBe(10);
  });

  it('reverts to normal when latency recovers', () => {
    const t = new ThrottleController({
      maxConcurrent: 20,
      latencyThresholdMs: 100,
      abortOnDegradationPct: 40,
      windowSize: 20
    });

    for (let i = 0; i < 10; i++) t.recordLatency(50);
    for (let i = 0; i < 2; i++) t.recordLatency(200);
    expect(t.getState()).toBe('throttle');

    // Enough fast samples to push slow ones out of the window
    for (let i = 0; i < 30; i++) t.recordLatency(50);
    expect(t.getState()).toBe('normal');
    expect(t.getConcurrencyLimit()).toBe(20);
  });

  it('transitions to abort on sustained degradation', () => {
    const t = new ThrottleController({
      maxConcurrent: 20,
      latencyThresholdMs: 500,
      abortOnDegradationPct: 40,
      windowSize: 20
    });

    // Baseline ~100ms
    for (let i = 0; i < 10; i++) t.recordLatency(100);

    // Degrade >40%
    for (let i = 0; i < 20; i++) t.recordLatency(600);
    expect(t.getState()).toBe('abort');
    expect(t.getConcurrencyLimit()).toBe(0);
  });

  it('does not transition from abort on further latency', () => {
    const t = new ThrottleController({
      maxConcurrent: 20,
      latencyThresholdMs: 100,
      abortOnDegradationPct: 40
    });

    t.forceAbort();
    expect(t.getState()).toBe('abort');
    t.recordLatency(50);
    expect(t.getState()).toBe('abort');
  });

  it('resets to normal', () => {
    const t = new ThrottleController({
      maxConcurrent: 20,
      latencyThresholdMs: 100,
      abortOnDegradationPct: 40
    });

    t.forceAbort();
    t.reset();
    expect(t.getState()).toBe('normal');
    expect(t.getConcurrencyLimit()).toBe(20);
  });

  it('floor concurrency at 1 in throttle', () => {
    const t = new ThrottleController({
      maxConcurrent: 1,
      latencyThresholdMs: 100,
      abortOnDegradationPct: 40,
      windowSize: 20
    });

    for (let i = 0; i < 10; i++) t.recordLatency(50);
    for (let i = 0; i < 2; i++) t.recordLatency(200);
    expect(t.getState()).toBe('throttle');
    expect(t.getConcurrencyLimit()).toBe(1);
  });
});
