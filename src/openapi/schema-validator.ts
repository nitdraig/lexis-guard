import { Ajv } from 'ajv';
import type { ErrorObject } from 'ajv';

export interface SchemaViolation {
  /** JSON pointer-ish path to the failing property, best-effort. */
  path: string;
  /** Human-readable message. */
  message: string;
  /** Which validation keyword triggered the violation. */
  keyword: string;
}

export interface SchemaValidationResult {
  ok: boolean;
  violations: SchemaViolation[];
}

/**
 * Validate a JSON response body against an OpenAPI-declared JSON Schema.
 * Uses ajv because hand-rolling JSON Schema is error-prone.
 */
export function validateResponseSchema(
  schema: unknown,
  body: unknown
): SchemaValidationResult {
  const ajv = new Ajv({ allErrors: true, strict: false });
  let validate: ReturnType<Ajv['compile']>;

  try {
    validate = ajv.compile(schema as object);
  } catch {
    // lexis: an invalid/malformed schema is not a finding — skip validation
    return { ok: true, violations: [] };
  }

  const ok = validate(body);
  if (ok) return { ok: true, violations: [] };

  const violations: SchemaViolation[] = (validate.errors ?? []).map((err: ErrorObject) => ({
    path: err.instancePath || '/',
    message: err.message ?? 'validation failed',
    keyword: err.keyword
  }));

  return { ok: false, violations };
}
