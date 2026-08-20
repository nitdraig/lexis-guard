import type { Lexisrc } from './lexisrc-schema.js';

export interface OAuthResolvedProfile {
  type: 'oauth2' | 'oidc';
  token: string;
  role: 'standard' | 'admin';
  owns: string[];
}

export type OAuthResolution =
  | { ok: true; profiles: OAuthResolvedProfile[] }
  | { ok: false; errors: string[] };

/**
 * Extract OAuth/OIDC profiles from resolved config. These profiles carry a
 * bearer token already obtained by the user; this pass only normalizes them so
 * the audit can build the same headers as standard bearer profiles.
 */
export function resolveOAuthProfiles(config: Lexisrc): OAuthResolution {
  const profiles: OAuthResolvedProfile[] = [];

  for (const profile of Object.values(config.auth.profiles)) {
    if (profile.type !== 'oauth2' && profile.type !== 'oidc') continue;
    profiles.push({
      type: profile.type,
      token: profile.token,
      role: profile.role,
      owns: profile.owns
    });
  }

  return { ok: true, profiles };
}
