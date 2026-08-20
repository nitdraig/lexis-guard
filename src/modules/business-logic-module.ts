import type { AuditPlugin } from '../plugins/plugin-types.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';

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
 * Business logic testing module. Driven entirely by user-declared context:
 * workflows (ordered steps) and price parameters. Gated because it submits
 * tampered values and parallel requests.
 * lexis: this is a conservative subset — full business logic testing is
 * inherently target-specific and out of scope for a generic scanner.
 */
export class BusinessLogicModule implements AuditPlugin {
  readonly id = 'business_logic';
  readonly name = 'Business logic';
  readonly version = '1.0.0';
  readonly protocol = 'http' as const;
  readonly requiresEscalation = true;

  async run(
    _target: string,
    config: Lexisrc,
    engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    _endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    // Workflow bypass: call the final step directly without prior steps.
    for (const workflow of config.business_logic.workflows) {
      const steps = workflow.steps;
      if (steps.length < 2) continue;
      const finalStep = steps[steps.length - 1];
      try {
        const resp = await engine.fetch(finalStep, 'POST');
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          track(
            finding(
              'WORKFLOW_BYPASS',
              finalStep,
              `Workflow "${workflow.name}" final step accepted without preceding steps`,
              'high',
              `Step ${finalStep} returned ${resp.statusCode} without prior workflow state`,
              'CWE-841',
              7.5
            )
          );
        }
      } catch {
        // lexis: ignore transport errors on workflow probes
      }
    }

    // Price manipulation: send a tampered value (0) for declared price params.
    for (const param of config.business_logic.price_params) {
      try {
        const resp = await engine.fetch('/', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ [param]: 0 }));
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          track(
            finding(
              'PRICE_MANIPULATION',
              '/',
              `Price parameter "${param}" accepted a tampered zero value`,
              'high',
              `Tampered ${param}=0 returned ${resp.statusCode}`,
              'CWE-602',
              7.5
            )
          );
        }
      } catch {
        // lexis: ignore transport errors on price manipulation probes
      }
    }

    return findings;
  }
}
