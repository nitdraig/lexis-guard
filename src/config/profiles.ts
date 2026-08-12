/**
 * Quick / Deep audit profiles.
 *
 * Quick: essential security + performance checks only.
 * Deep: full suite including scalability, BOLA/BFLA cross-auth, soak tests.
 *
 * These are explicit matrices so adding a new check requires updating
 * the profile definition, not the orchestrator.
 */

export type CheckId =
  | 'headers'
  | 'cors'
  | 'tls'
  | 'file_exposure'
  | 'jwt_detection'
  | 'bola'
  | 'bfla'
  | 'latency'
  | 'payload_compression'
  | 'http2'
  | 'rate_limit'
  | 'soak_test'
  | 'throttle_state'
  | 'broken_auth'
  | 'mass_assignment'
  | 'data_exposure';

export interface ProfileDefinition {
  id: 'quick' | 'deep';
  name: string;
  checks: CheckId[];
}

export const QUICK_PROFILE: ProfileDefinition = {
  id: 'quick',
  name: 'Quick',
  checks: [
    'headers',
    'cors',
    'file_exposure',
    'jwt_detection',
    'latency',
    'rate_limit'
  ]
};

export const DEEP_PROFILE: ProfileDefinition = {
  id: 'deep',
  name: 'Deep',
  checks: [
    'headers',
    'cors',
    'tls',
    'file_exposure',
    'jwt_detection',
    'bola',
    'bfla',
    'latency',
    'payload_compression',
    'http2',
    'rate_limit',
    'soak_test',
    'throttle_state',
    'broken_auth',
    'mass_assignment',
    'data_exposure'
  ]
};

export const PROFILES: Record<string, ProfileDefinition> = {
  quick: QUICK_PROFILE,
  deep: DEEP_PROFILE
};

export function resolveProfile(profileId?: string): ProfileDefinition {
  if (!profileId) return QUICK_PROFILE;
  return PROFILES[profileId] ?? QUICK_PROFILE;
}
