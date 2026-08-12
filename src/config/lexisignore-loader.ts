import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { parseLexisignoreStrict, type ParseResult } from './lexisignore-parser.js';
import type { Lexisignore } from './lexisignore-schema.js';

const IGNORE_FILENAME = '.lexisignore';

/**
 * Load `.lexisignore` from the current directory, or next to the config file.
 * Returns null when no file exists; throws on invalid/expired content
 * (loud failure — suppressions that silently lapse are a CI hazard).
 */
export function loadLexisignore(configPath?: string | null): Lexisignore | null {
  const candidates = [resolve(IGNORE_FILENAME)];
  if (configPath) {
    candidates.unshift(join(dirname(resolve(configPath)), IGNORE_FILENAME));
  }

  const file = candidates.find((p) => existsSync(p));
  if (!file) return null;

  const content = readFileSync(file, 'utf-8');
  return parseLexisignoreStrict(content);
}

/**
 * Non-throwing variant for callers that prefer a graceful result.
 */
export function tryLoadLexisignore(configPath?: string | null): ParseResult {
  try {
    return { ok: true, data: loadLexisignore(configPath) ?? { ignore: [] } };
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}