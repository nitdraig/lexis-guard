import type { AuditPlugin } from '../plugins/plugin-types.js';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
import type { Endpoint } from '../openapi/parser.js';
import { loadWordlist } from '../fuzzing/wordlist-loader.js';
import { runFuzz } from '../fuzzing/fuzz-engine.js';

/**
 * Fuzzing module. Mutates seed words and probes spec endpoints. Gated because
 * it sends attacker-controlled payloads and can multiply request count.
 */
export class FuzzingModule implements AuditPlugin {
  readonly id = 'fuzzing';
  readonly name = 'Fuzzing';
  readonly version = '1.0.0';
  readonly protocol = 'http' as const;
  readonly requiresEscalation = true;

  async run(
    _target: string,
    config: Lexisrc,
    engine: HttpEngine,
    onFinding?: (f: Finding) => void,
    endpoints?: Endpoint[]
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const track = (f: Finding): void => {
      findings.push(f);
      onFinding?.(f);
    };

    const wordlists = config.fuzzing.wordlists ?? [];
    const seeds: string[] = [];
    for (const wordlist of wordlists) {
      try {
        seeds.push(...loadWordlist(wordlist));
      } catch {
        // lexis: a missing wordlist is skipped, not fatal
      }
    }

    if (seeds.length === 0) return findings;

    const probePaths = this.probePaths(endpoints);
    for (const probe of probePaths) {
      const result = await runFuzz(engine, probe.path, probe.method, {
        seeds,
        mutations: config.fuzzing.mutations,
        maxCases: config.fuzzing.max_cases
      });
      for (const f of result.findings) track(f);
    }

    return findings;
  }

  private probePaths(endpoints?: Endpoint[]): Array<{ path: string; method: string }> {
    if (endpoints && endpoints.length > 0) {
      return endpoints
        .filter((e) => e.method === 'GET')
        .slice(0, 3)
        .map((e) => ({ path: e.path, method: e.method }));
    }
    return [{ path: '/', method: 'GET' }];
  }
}
