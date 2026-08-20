import type { AuditPlugin } from '../plugins/plugin-types.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { checkGrpcHealth } from '../grpc/grpc-client.js';

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
    hash: generateFindingHash(ruleId, path, 'GRPC'),
    rule_id: ruleId,
    method: 'GRPC',
    path,
    description,
    severity,
    evidence,
    cwe,
    cvss
  };
}

/**
 * gRPC audit module. Probes the standard health service over an insecure
 * channel. Gated because it opens live connections to the target.
 */
export class GrpcModule implements AuditPlugin {
  readonly id = 'grpc';
  readonly name = 'gRPC';
  readonly version = '1.0.0';
  readonly protocol = 'grpc' as const;
  readonly requiresEscalation = true;

  async run(
    target: string,
    _config: Lexisrc,
    _engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    _endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    const address = this.resolveAddress(target);
    const result = await checkGrpcHealth(address);

    if (!result.reachable) return findings;

    track(
      finding(
        'GRPC_INSECURE_HEALTH_ACCESSIBLE',
        address,
        'gRPC health service accessible over an insecure channel',
        'medium',
        `Health service responded with status ${result.status ?? 'unknown'}`,
        'CWE-319',
        5.3
      )
    );

    return findings;
  }

  private resolveAddress(target: string): string {
    return /^https?:\/\//i.test(target)
      ? target.replace(/^https?:\/\//, '')
      : target;
  }
}
