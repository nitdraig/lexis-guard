import { createHash } from 'node:crypto';

/**
 * Deterministic hash of a finding's identity fields.
 * Used to match findings against `.lexisignore` entries.
 *
 * When `payload` is supplied (fuzzing), it becomes part of the identity so
 * distinct payloads never collapse into a single deduped finding.
 */
export function generateFindingHash(
  ruleId: string,
  path: string,
  method: string,
  payload?: string
): string {
  const data = payload === undefined
    ? `${ruleId}:${path}:${method.toUpperCase()}`
    : `${ruleId}:${path}:${method.toUpperCase()}:${payload}`;
  return createHash('sha256').update(data).digest('hex').slice(0, 12);
}
