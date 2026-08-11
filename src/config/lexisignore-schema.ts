import { z } from 'zod';

/**
 * Zod schema for a single ignored finding entry.
 * All fields are required — no silent defaults.
 */
export const ignoredFindingSchema = z.object({
  hash: z.string().min(1, 'hash must not be empty'),
  rule_id: z.string().min(1, 'rule_id must not be empty'),
  path: z.string().min(1, 'path must not be empty'),
  method: z.string().min(1, 'method must not be empty').toUpperCase(),
  reason: z.string().min(1, 'reason must not be empty'),
  approved_by: z.string().email('approved_by must be a valid email'),
  expires: z.string().refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: 'expires must be a valid ISO 8601 date string' }
  )
});

export type IgnoredFinding = z.infer<typeof ignoredFindingSchema>;

/**
 * Zod schema for the full `.lexisignore` document.
 */
export const lexisignoreSchema = z.object({
  ignore: z.array(ignoredFindingSchema).min(0)
});

export type Lexisignore = z.infer<typeof lexisignoreSchema>;
