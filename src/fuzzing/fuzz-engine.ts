import type { HttpEngine } from '../core/http-engine.js';
import type { Finding } from '../types/finding.js';
import { generateFindingHash } from '../utils/finding-hash.js';
import { mutate } from './mutator.js';

export interface FuzzCase {
  path: string;
  method: string;
  payload: string;
  strategy: string;
}

export interface FuzzRunOptions {
  /** Seed words to mutate and send. */
  seeds: string[];
  /** Maximum mutations per seed. */
  mutations: number;
  /** Hard ceiling on the number of cases actually executed. */
  maxCases: number;
}

export interface FuzzEngineResult {
  findings: Finding[];
  casesExecuted: number;
}

/**
 * Bounded fuzzing engine. Generates deterministic cases from seeds and sends
 * them through HttpEngine, reporting reflection of the payload as a finding.
 */
export async function runFuzz(
  engine: HttpEngine,
  path: string,
  method: string,
  options: FuzzRunOptions
): Promise<FuzzEngineResult> {
  const findings: Finding[] = [];
  let casesExecuted = 0;

  const cases: FuzzCase[] = [];
  for (const seed of options.seeds) {
    for (const mutation of mutate(seed, options.mutations)) {
      cases.push({ path, method, payload: mutation.payload, strategy: mutation.strategy });
    }
  }

  for (const testCase of cases.slice(0, options.maxCases)) {
    try {
      const targetPath = injectParam(path, testCase.payload);
      const resp = await engine.fetch(targetPath, method);
      casesExecuted += 1;

      if (resp.body.includes(testCase.payload)) {
        findings.push({
          hash: generateFindingHash('FUZZ_REFLECTED_PAYLOAD', path, method, testCase.payload),
          rule_id: 'FUZZ_REFLECTED_PAYLOAD',
          method,
          path,
          description: 'Fuzzed payload reflected in response',
          severity: 'medium',
          evidence: `Payload "${testCase.payload}" reflected`,
          payload: testCase.payload,
          mutation: testCase.strategy
        });
      }
    } catch {
      // lexis: transport/limit errors are not findings, they just stop this case
    }
  }

  return { findings, casesExecuted };
}

function injectParam(path: string, payload: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}q=${encodeURIComponent(payload)}`;
}
