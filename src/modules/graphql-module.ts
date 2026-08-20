import type { AuditPlugin } from '../plugins/plugin-types.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { introspect } from '../graphql/introspection.js';

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
    hash: generateFindingHash(ruleId, path, 'POST'),
    rule_id: ruleId,
    method: 'POST',
    path,
    description,
    severity,
    evidence,
    cwe,
    cvss
  };
}

/**
 * GraphQL audit module. Passive introspection and field-suggestion checks.
 * lexis: unauthenticated mutation probes are deliberately deferred because the
 * escalation gate is module-scoped; shipping them here would force the whole
 * passive check set behind --allow-exploitation.
 */
export class GraphQLModule implements AuditPlugin {
  readonly id = 'graphql';
  readonly name = 'GraphQL';
  readonly version = '1.0.0';
  readonly protocol = 'graphql' as const;

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

    const endpoint = this.resolveEndpoint(endpoints);
    const summary = await introspect(endpoint, engine);

    if (summary.introspectable) {
      track(
        finding(
          'GRAPHQL_INTROSPECTION_ENABLED',
          endpoint,
          'GraphQL introspection query is enabled',
          'medium',
          'Server returned a valid __schema introspection payload',
          'CWE-200',
          5.3
        )
      );
    } else {
      return findings;
    }

    // Field suggestion: GraphQL error responses commonly enumerate valid names.
    try {
      const resp = await engine.fetch(
        endpoint,
        'POST',
        { 'content-type': 'application/json' },
        JSON.stringify({ query: '{ __nonexistent_field__ }' })
      );
      if (/did you mean|cannot query field|field .* does not exist/i.test(resp.body)) {
        track(
          finding(
            'GRAPHQL_FIELD_SUGGESTION',
            endpoint,
            'GraphQL field suggestion leak',
            'low',
            'Invalid field names are reflected with suggestions',
            'CWE-200',
            3.1
          )
        );
      }
    } catch {
      // lexis: ignore transport errors on passive probes
    }

    return findings;
  }

  private resolveEndpoint(endpoints?: Endpoint[]): string {
    const candidate = endpoints?.find((e) => e.path.toLowerCase().includes('graphql'));
    return candidate?.path ?? '/graphql';
  }
}
