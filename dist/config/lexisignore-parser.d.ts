import { type Lexisignore } from './lexisignore-schema.js';
/**
 * Result of parsing `.lexisignore`.
 */
export type ParseResult = {
    ok: true;
    data: Lexisignore;
} | {
    ok: false;
    errors: string[];
};
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
export declare function parseLexisignore(content: string | unknown): ParseResult;
/**
 * Throws on invalid or expired `.lexisignore`.
 * Use in CI pipelines where silent failures are unacceptable.
 */
export declare function parseLexisignoreStrict(content: string | unknown): Lexisignore;
//# sourceMappingURL=lexisignore-parser.d.ts.map