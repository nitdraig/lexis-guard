import { type Lexisrc } from './lexisrc-schema.js';
/**
 * Result of parsing `.lexisrc.json`.
 */
export type ParseLexisrcResult = {
    ok: true;
    data: Lexisrc;
} | {
    ok: false;
    errors: string[];
};
/**
 * Parse raw `.lexisrc.json` content with env var interpolation.
 *
 * Steps:
 * 1. Parse JSON.
 * 2. Validate against raw schema (structure + defaults).
 * 3. Interpolate `${ENV_VAR}` in auth tokens.
 * 4. Validate resolved data against strict schema.
 * 5. Validate multi-auth requirements.
 */
export declare function parseLexisrc(content: string | unknown): ParseLexisrcResult;
/**
 * Strict version — throws on any error.
 */
export declare function parseLexisrcStrict(content: string | unknown): Lexisrc;
//# sourceMappingURL=lexisrc-parser.d.ts.map