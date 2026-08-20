import { readFileSync } from 'node:fs';

/**
 * Load newline-delimited wordlists from local files. Blank lines and comments
 * are skipped so wordlists can carry documentation inline.
 */
export function loadWordlist(path: string): string[] {
  const raw = readFileSync(path, 'utf-8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}
