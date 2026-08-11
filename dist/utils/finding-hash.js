import { createHash } from 'node:crypto';
/**
 * Deterministic hash of a finding's identity fields.
 * Used to match findings against `.lexisignore` entries.
 */
export function generateFindingHash(ruleId, path, method) {
    const data = `${ruleId}:${path}:${method.toUpperCase()}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 12);
}
//# sourceMappingURL=finding-hash.js.map