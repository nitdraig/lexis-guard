import type { RawLexisrc } from './lexisrc-schema.js';

/**
 * Default `.lexisrc.json` used when no config file exists.
 * Keeps tokens as `${ENV_VAR}` placeholders (never resolved secrets).
 */
export function defaultRawLexisrc(): RawLexisrc {
  return {
    scope: {
      allowed_targets: [],
      environment: 'staging'
    },
    mode: 'safe',
    auth: {
      profiles: {
        user_a: { type: 'bearer', token: '${LEXIS_USER_A_TOKEN}', role: 'standard', owns: [] },
        user_b: { type: 'bearer', token: '${LEXIS_USER_B_TOKEN}', role: 'standard', owns: [] },
        admin: { type: 'bearer', token: '${LEXIS_ADMIN_TOKEN}', role: 'admin', owns: [] }
      }
    },
    ai: {
      provider: 'openai',
      model: 'gpt-5.4-nano',
      api_key: '',
      redact_target: true,
      local_fallback: true
    },
    limits: {
      max_concurrent_requests: 20,
      max_requests_per_test: 500,
      abort_on_latency_degradation_pct: 40
    }
  };
}