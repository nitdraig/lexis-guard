import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { validateResponseSchema } from '../openapi/schema-validator.js';

function finding(
  ruleId: string,
  method: string,
  path: string,
  description: string,
  severity: Finding['severity'],
  evidence: string,
  cwe?: string,
  cvss?: number
): Finding {
  return {
    hash: generateFindingHash(ruleId, path, method),
    rule_id: ruleId,
    method,
    path,
    description,
    severity,
    evidence,
    cwe,
    cvss
  };
}

/**
 * Contract module — validates live responses against OpenAPI-declared
 * JSON Schemas. Passive check: never mutates the target.
 */
export class ContractModule implements AuditModule {
  readonly id = 'contract';
  readonly name = 'Schema contract';

  async run(
    _target: string,
    _config: Lexisrc,
    engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    const validated = (endpoints ?? []).filter((ep) => ep.method === 'GET' && ep.responseSchema);

    for (const ep of validated) {
      try {
        const resp = await engine.fetch(ep.path, ep.method);
        if (!/json/i.test(resp.headers['content-type'] as string ?? '')) {
          continue;
        }
        let body: unknown;
        try {
          body = JSON.parse(resp.body);
        } catch {
          continue;
        }

        const result = validateResponseSchema(ep.responseSchema, body);
        if (!result.ok) {
          const evidence = result.violations
            .slice(0, 3)
            .map((v) => `${v.path}: ${v.message} (${v.keyword})`)
            .join('; ');
          track(
            finding(
              'SCHEMA_CONTRACT_VIOLATION',
              ep.method,
              ep.path,
              'Response body violates the declared OpenAPI schema',
              'medium',
              `Violations: ${evidence}`,
              'CWE-1104',
              4.0
            )
          );
        }
      } catch {
        // lexis: ignore connection errors on contract probes
      }
    }

    return findings;
  }
}
