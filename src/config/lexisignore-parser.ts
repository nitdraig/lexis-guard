import { lexisignoreSchema, type Lexisignore, type IgnoredFinding } from './lexisignore-schema.js';

/**
 * Result of parsing `.lexisignore`.
 */
export type ParseResult =
  | { ok: true; data: Lexisignore }
  | { ok: false; errors: string[] };

/**
 * Checks whether an ignore entry has expired.
 */
function isExpired(entry: IgnoredFinding): boolean {
  const expiresAt = new Date(entry.expires);
  const now = new Date();
  return expiresAt < now;
}

/**
 * Parses raw JSON content of `.lexisignore`.
 *
 * Steps:
 * 1. Parse JSON.
 * 2. Validate against Zod schema.
 * 3. Check expiration — **loud failure** on any expired entry.
 *
 * Returns `{ ok: false, errors }` on any failure so callers decide
 * whether to throw or report.
 */
export function parseLexisignore(content: string | unknown): ParseResult {
  let raw: unknown;

  if (typeof content === 'string') {
    try {
      raw = JSON.parse(content);
    } catch {
      return { ok: false, errors: ['Invalid JSON'] };
    }
  } else {
    raw = content;
  }

  const parsed = lexisignoreSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    );
    return { ok: false, errors };
  }

  const expired = parsed.data.ignore.filter(isExpired);
  if (expired.length > 0) {
    const errors = expired.map(
      (e) =>
        `Expired ignore entry: hash=${e.hash} rule_id=${e.rule_id} path=${e.path} ` +
        `method=${e.method} expired=${e.expires} approved_by=${e.approved_by}`
    );
    return { ok: false, errors };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Throws on invalid or expired `.lexisignore`.
 * Use in CI pipelines where silent failures are unacceptable.
 */
export function parseLexisignoreStrict(content: string | unknown): Lexisignore {
  const result = parseLexisignore(content);
  if (!result.ok) {
    throw new Error(result.errors.join('\n'));
  }
  return result.data;
}
