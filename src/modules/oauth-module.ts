import type { AuditPlugin } from '../plugins/plugin-types.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { resolveOAuthProfiles } from '../config/oauth-profile.js';

function finding(
  ruleId: string,
  path: string,
  description: string,
  severity: Finding['severity'],
  evidence: string,
  cwe?: string,
  cvss?: number
): Finding {
  return {
    hash: generateFindingHash(ruleId, path, 'GET'),
    rule_id: ruleId,
    method: 'GET',
    path,
    description,
    severity,
    evidence,
    cwe,
    cvss
  };
}

/**
 * OAuth/OIDC audit module. Passively validates the resolved OAuth profiles and
 * flags a weak redirect URI when one is declared in config.
 * lexis: full redirect-URI manipulation, PKCE bypass and scope escalation need
 * an authorization server and are deferred to a dedicated OAuth design pass.
 */
export class OAuthModule implements AuditPlugin {
  readonly id = 'oauth';
  readonly name = 'OAuth/OIDC';
  readonly version = '1.0.0';
  readonly protocol = 'http' as const;

  async run(
    _target: string,
    config: Lexisrc,
    _engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    _endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    const resolution = resolveOAuthProfiles(config);
    if (!resolution.ok || resolution.profiles.length === 0) return findings;

    const redirectUri = config.oauth.redirect_uri;
    if (redirectUri && isWeakRedirectUri(redirectUri)) {
      track(
        finding(
          'OAUTH_WEAK_REDIRECT_URI',
          '/',
          'OAuth redirect URI is vulnerable to open redirect or loopback misuse',
          'high',
          `Configured redirect URI: ${redirectUri}`,
          'CWE-601',
          8.1
        )
      );
    }

    if (!config.oauth.pkce && config.oauth.authorization_server) {
      track(
        finding(
          'OAUTH_PKCE_DISABLED',
          '/',
          'OAuth authorization code flow does not use PKCE',
          'medium',
          'PKCE is disabled for a public-client-style flow',
          'CWE-522',
          5.3
        )
      );
    }

    return findings;
  }
}

function isWeakRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
