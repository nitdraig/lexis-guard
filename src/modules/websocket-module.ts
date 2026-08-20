import type { AuditPlugin } from '../plugins/plugin-types.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { probeWebSocket } from '../websocket/ws-client.js';

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
    hash: generateFindingHash(ruleId, path, 'WS'),
    rule_id: ruleId,
    method: 'WS',
    path,
    description,
    severity,
    evidence,
    cwe,
    cvss
  };
}

/**
 * WebSocket audit module. Probes the handshake and, when configured, sends a
 * probe message. Gated because it opens live connections to the target.
 */
export class WebSocketModule implements AuditPlugin {
  readonly id = 'websocket';
  readonly name = 'WebSocket';
  readonly version = '1.0.0';
  readonly protocol = 'websocket' as const;
  readonly requiresEscalation = true;

  async run(
    target: string,
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

    const endpoint = config.websocket.endpoint;
    if (!endpoint) return findings;

    const url = this.resolveUrl(target, endpoint);
    const result = await probeWebSocket({ url, message: 'ping' });

    if (!result.connected) {
      if (result.statusCode === 401 || result.statusCode === 403) {
        return findings;
      }
      return findings;
    }

    // Handshake succeeded without explicit auth — flag if the target claims auth.
    if (result.statusCode === undefined) {
      track(
        finding(
          'WEBSOCKET_UNAUTHENTICATED_HANDSHAKE',
          endpoint,
          'WebSocket handshake completed without authentication',
          'medium',
          'Connection upgraded with no auth challenge',
          'CWE-306',
          6.5
        )
      );
    }

    return findings;
  }

  private resolveUrl(target: string, endpoint: string): string {
    if (/^wss?:\/\//i.test(endpoint)) return endpoint;
    const base = /^https?:\/\//i.test(target)
      ? target.replace(/^http/i, 'ws')
      : `wss://${target}`;
    return `${base.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  }
}
