import { z } from 'zod';

const authTypeSchema = z.enum(['bearer', 'api_key', 'basic']);
const roleSchema = z.enum(['standard', 'admin']);
const modeSchema = z.enum(['safe', 'aggressive']);
const profileSchema = z.enum(['quick', 'deep']);
const aiProviderSchema = z.enum(['openai', 'deepseek', 'anthropic', 'ollama', 'lmstudio']);

/**
 * Raw profile as it appears in JSON (token may contain ${ENV_VAR}).
 */
export const rawAuthProfileSchema = z.object({
  type: authTypeSchema,
  token: z.string().min(1, 'token must not be empty'),
  role: roleSchema,
  owns: z.array(z.string().min(1)).optional().default([])
});

export type RawAuthProfile = z.infer<typeof rawAuthProfileSchema>;

/**
 * Parsed profile with resolved token (no ${} placeholders).
 */
export const authProfileSchema = z.object({
  type: authTypeSchema,
  token: z.string().min(1, 'token must not be empty'),
  role: roleSchema,
  owns: z.array(z.string().min(1))
});

export type AuthProfile = z.infer<typeof authProfileSchema>;

/**
 * Raw `.lexisrc.json` schema before env interpolation.
 */
export const rawLexisrcSchema = z.object({
  scope: z.object({
    allowed_targets: z.array(z.string().min(1)).min(1, 'allowed_targets must contain at least one entry'),
    environment: z.string().min(1)
  }),
  mode: modeSchema.default('safe'),
  profile: profileSchema.default('deep'),
  auth: z.object({
    profiles: z.record(z.string().min(1), rawAuthProfileSchema)
      .refine((profiles) => Object.keys(profiles).length >= 1, {
        message: 'at least one auth profile is required'
      })
  }),
  ai: z.object({
    provider: aiProviderSchema,
    redact_target: z.boolean().default(true),
    local_fallback: z.boolean().default(false),
    model: z.string().min(1).optional(),
    api_key: z.string().optional()
  }),
  limits: z.object({
    max_concurrent_requests: z.number().int().positive().default(20),
    max_requests_per_test: z.number().int().positive().default(500),
    abort_on_latency_degradation_pct: z.number().int().min(0).max(100).default(40)
  }).optional().default({
    max_concurrent_requests: 20,
    max_requests_per_test: 500,
    abort_on_latency_degradation_pct: 40
  })
});

export type RawLexisrc = z.infer<typeof rawLexisrcSchema>;

/**
 * Fully parsed `.lexisrc.json` with resolved env vars.
 */
export const lexisrcSchema = z.object({
  scope: z.object({
    allowed_targets: z.array(z.string().min(1)).min(1),
    environment: z.string().min(1)
  }),
  mode: modeSchema,
  profile: profileSchema,
  auth: z.object({
    profiles: z.record(z.string().min(1), authProfileSchema)
  }),
  ai: z.object({
    provider: aiProviderSchema,
    redact_target: z.boolean(),
    local_fallback: z.boolean(),
    model: z.string().min(1),
    api_key: z.string()
  }),
  limits: z.object({
    max_concurrent_requests: z.number().int().positive(),
    max_requests_per_test: z.number().int().positive(),
    abort_on_latency_degradation_pct: z.number().int().min(0).max(100)
  })
});

export type Lexisrc = z.infer<typeof lexisrcSchema>;
