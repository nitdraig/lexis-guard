import type { AuditModule } from './audit-module.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import {
  SQLI_ERROR_PROBES,
  SQLI_BLIND_PROBES,
  NOSQLI_PROBES,
  COMMAND_INJECTION_PROBES,
  PATH_TRAVERSAL_PROBES,
  type InjectionProbe
} from './payloads/injection-payloads.js';

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

const RULE_MAP: Record<string, { ruleId: string; cwe: string; cvss: number }> = {
  'sql-error-based': { ruleId: 'SQLI_ERROR_BASED', cwe: 'CWE-89', cvss: 9.8 },
  'sql-boolean': { ruleId: 'SQLI_BLIND_BOOLEAN', cwe: 'CWE-89', cvss: 9.8 },
  'nosql-injection': { ruleId: 'NOSQL_INJECTION', cwe: 'CWE-943', cvss: 9.8 },
  'command-injection': { ruleId: 'COMMAND_INJECTION', cwe: 'CWE-78', cvss: 9.8 },
  'path-traversal': { ruleId: 'PATH_TRAVERSAL', cwe: 'CWE-22', cvss: 7.5 }
};

/**
 * Injection Module — error-based and boolean-based SQLi, NoSQLi,
 * command injection and path traversal. Gated behind escalation.
 */
export class InjectionModule implements AuditModule {
  readonly id = 'injection';
  readonly name = 'Injection';
  readonly requiresEscalation = true;

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

    const probeTargets = this.probeTargets(endpoints);

    for (const target of probeTargets) {
      await this.runErrorBased(target.path, target.method, engine, track);
      await this.runBooleanBased(target.path, target.method, engine, track);
      await this.runNoSql(target.path, target.method, engine, track);
      await this.runCommandInjection(target.path, target.method, engine, track);
    }

    await this.runPathTraversal(endpoints, engine, track);

    return findings;
  }

  /** Query-injectable targets: spec GET endpoints, else a root heuristic. */
  private probeTargets(endpoints?: Endpoint[]): Array<{ path: string; method: string }> {
    if (endpoints && endpoints.length > 0) {
      return endpoints
        .filter((ep) => ep.method === 'GET')
        .slice(0, 3)
        .map((ep) => ({ path: ep.path, method: ep.method }));
    }
    return [{ path: '/', method: 'GET' }];
  }

  private injectQuery(path: string, payload: string): string {
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}q=${encodeURIComponent(payload)}`;
  }

  private async runProbe(
    path: string,
    method: string,
    probe: InjectionProbe,
    engine: HttpEngine,
    track: (f: Finding) => void
  ): Promise<void> {
    try {
      const resp = await engine.fetch(this.injectQuery(path, probe.payload), method);
      const body = resp.body.toLowerCase();
      if (probe.signatures.some((sig) => body.includes(sig.toLowerCase()))) {
        const meta = RULE_MAP[probe.vector];
        track(
          finding(
            meta.ruleId,
            method,
            path,
            `${probe.vector} reflected in response`,
            'critical',
            `Payload "${probe.payload}" returned signature: ${probe.signatures.find((s) => body.includes(s.toLowerCase()))}`,
            meta.cwe,
            meta.cvss
          )
        );
      }
    } catch {
      // lexis: connection errors on injection probes are not findings
    }
  }

  private async runErrorBased(
    path: string,
    method: string,
    engine: HttpEngine,
    track: (f: Finding) => void
  ): Promise<void> {
    for (const probe of SQLI_ERROR_PROBES) {
      await this.runProbe(path, method, probe, engine, track);
    }
  }

  private async runBooleanBased(
    path: string,
    method: string,
    engine: HttpEngine,
    track: (f: Finding) => void
  ): Promise<void> {
    // Boolean-based: compare 1=1 (truthy) against 1=2 (falsey). A meaningful
    // difference in response suggests the predicate reached a query engine.
    const truePath = this.injectQuery(path, SQLI_BLIND_PROBES[0].payload);
    const falsePath = this.injectQuery(path, SQLI_BLIND_PROBES[1].payload);
    try {
      const trueResp = await engine.fetch(truePath, method);
      const falseResp = await engine.fetch(falsePath, method);
      const trueSize = trueResp.body.length;
      const falseSize = falseResp.body.length;
      if (Math.abs(trueSize - falseSize) > 20) {
        const meta = RULE_MAP['sql-boolean'];
        track(
          finding(
            meta.ruleId,
            method,
            path,
            'Boolean-based SQLi: response differs between true and false predicates',
            'critical',
            `1=1 body ${trueSize} bytes vs 1=2 body ${falseSize} bytes`,
            meta.cwe,
            meta.cvss
          )
        );
      }
    } catch {
      // lexis: ignore connection errors on boolean probes
    }
  }

  private async runNoSql(
    path: string,
    method: string,
    engine: HttpEngine,
    track: (f: Finding) => void
  ): Promise<void> {
    for (const probe of NOSQLI_PROBES) {
      await this.runProbe(path, method, probe, engine, track);
    }
  }

  private async runCommandInjection(
    path: string,
    method: string,
    engine: HttpEngine,
    track: (f: Finding) => void
  ): Promise<void> {
    for (const probe of COMMAND_INJECTION_PROBES) {
      await this.runProbe(path, method, probe, engine, track);
    }
  }

  /** Substitute traversal payloads into spec path templates, or probe root. */
  private async runPathTraversal(
    endpoints: Endpoint[] | undefined,
    engine: HttpEngine,
    track: (f: Finding) => void
  ): Promise<void> {
    const templates = endpoints?.filter((ep) => ep.method === 'GET' && /\{[^}]+\}/.test(ep.path)) ?? [];
    const paths = templates.length > 0
      ? templates.map((ep) => ep.path)
      : ['/'];

    for (const template of paths) {
      for (const probe of PATH_TRAVERSAL_PROBES) {
        const path = template.replace(/\{[^}]+\}/g, probe.payload);
        try {
          const resp = await engine.fetch(path, 'GET');
          const body = resp.body.toLowerCase();
          if (probe.signatures.some((sig) => body.includes(sig.toLowerCase()))) {
            const meta = RULE_MAP['path-traversal'];
            track(
              finding(
                meta.ruleId,
                'GET',
                template,
                'Path traversal: sensitive file content returned',
                'high',
                `Payload "${probe.payload}" returned a signature of /etc/passwd`,
                meta.cwe,
                meta.cvss
              )
            );
          }
        } catch {
          // lexis: ignore connection errors on traversal probes
        }
      }
    }
  }
}
