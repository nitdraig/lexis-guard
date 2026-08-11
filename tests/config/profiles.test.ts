import { describe, it, expect } from 'vitest';
import { resolveProfile, QUICK_PROFILE, DEEP_PROFILE } from '../../src/config/profiles.js';

describe('profiles', () => {
  it('defaults to quick when no profile specified', () => {
    const profile = resolveProfile();
    expect(profile.id).toBe('quick');
    expect(profile.checks).toContain('headers');
    expect(profile.checks).toContain('latency');
    expect(profile.checks).not.toContain('bola');
  });

  it('resolves deep profile', () => {
    const profile = resolveProfile('deep');
    expect(profile.id).toBe('deep');
    expect(profile.checks).toContain('bola');
    expect(profile.checks).toContain('bfla');
    expect(profile.checks).toContain('soak_test');
    expect(profile.checks).toContain('throttle_state');
  });

  it('falls back to quick on unknown profile', () => {
    const profile = resolveProfile('nonexistent');
    expect(profile.id).toBe('quick');
  });

  it('deep has more checks than quick', () => {
    expect(DEEP_PROFILE.checks.length).toBeGreaterThan(QUICK_PROFILE.checks.length);
  });
});
