import { z } from 'zod';
/**
 * Raw profile as it appears in JSON (token may contain ${ENV_VAR}).
 */
export declare const rawAuthProfileSchema: z.ZodObject<{
    type: z.ZodEnum<["bearer", "api_key", "basic"]>;
    token: z.ZodString;
    role: z.ZodEnum<["standard", "admin"]>;
    owns: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    type: "bearer" | "api_key" | "basic";
    token: string;
    role: "standard" | "admin";
    owns: string[];
}, {
    type: "bearer" | "api_key" | "basic";
    token: string;
    role: "standard" | "admin";
    owns?: string[] | undefined;
}>;
export type RawAuthProfile = z.infer<typeof rawAuthProfileSchema>;
/**
 * Parsed profile with resolved token (no ${} placeholders).
 */
export declare const authProfileSchema: z.ZodObject<{
    type: z.ZodEnum<["bearer", "api_key", "basic"]>;
    token: z.ZodString;
    role: z.ZodEnum<["standard", "admin"]>;
    owns: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "bearer" | "api_key" | "basic";
    token: string;
    role: "standard" | "admin";
    owns: string[];
}, {
    type: "bearer" | "api_key" | "basic";
    token: string;
    role: "standard" | "admin";
    owns: string[];
}>;
export type AuthProfile = z.infer<typeof authProfileSchema>;
/**
 * Raw `.lexisrc.json` schema before env interpolation.
 */
export declare const rawLexisrcSchema: z.ZodObject<{
    scope: z.ZodObject<{
        allowed_targets: z.ZodArray<z.ZodString, "many">;
        environment: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        allowed_targets: string[];
        environment: string;
    }, {
        allowed_targets: string[];
        environment: string;
    }>;
    mode: z.ZodDefault<z.ZodEnum<["safe", "aggressive"]>>;
    auth: z.ZodObject<{
        profiles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
            type: z.ZodEnum<["bearer", "api_key", "basic"]>;
            token: z.ZodString;
            role: z.ZodEnum<["standard", "admin"]>;
            owns: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns?: string[] | undefined;
        }>>, Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>, Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>;
    }, {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns?: string[] | undefined;
        }>;
    }>;
    ai: z.ZodObject<{
        provider: z.ZodEnum<["openai", "deepseek", "anthropic", "ollama", "lmstudio"]>;
        redact_target: z.ZodDefault<z.ZodBoolean>;
        local_fallback: z.ZodDefault<z.ZodBoolean>;
        model: z.ZodOptional<z.ZodString>;
        api_key: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        redact_target: boolean;
        local_fallback: boolean;
        api_key?: string | undefined;
        model?: string | undefined;
    }, {
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        api_key?: string | undefined;
        redact_target?: boolean | undefined;
        local_fallback?: boolean | undefined;
        model?: string | undefined;
    }>;
    limits: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        max_concurrent_requests: z.ZodDefault<z.ZodNumber>;
        max_requests_per_test: z.ZodDefault<z.ZodNumber>;
        abort_on_latency_degradation_pct: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        max_concurrent_requests: number;
        max_requests_per_test: number;
        abort_on_latency_degradation_pct: number;
    }, {
        max_concurrent_requests?: number | undefined;
        max_requests_per_test?: number | undefined;
        abort_on_latency_degradation_pct?: number | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    scope: {
        allowed_targets: string[];
        environment: string;
    };
    mode: "safe" | "aggressive";
    auth: {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>;
    };
    ai: {
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        redact_target: boolean;
        local_fallback: boolean;
        api_key?: string | undefined;
        model?: string | undefined;
    };
    limits: {
        max_concurrent_requests: number;
        max_requests_per_test: number;
        abort_on_latency_degradation_pct: number;
    };
}, {
    scope: {
        allowed_targets: string[];
        environment: string;
    };
    auth: {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns?: string[] | undefined;
        }>;
    };
    ai: {
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        api_key?: string | undefined;
        redact_target?: boolean | undefined;
        local_fallback?: boolean | undefined;
        model?: string | undefined;
    };
    mode?: "safe" | "aggressive" | undefined;
    limits?: {
        max_concurrent_requests?: number | undefined;
        max_requests_per_test?: number | undefined;
        abort_on_latency_degradation_pct?: number | undefined;
    } | undefined;
}>;
export type RawLexisrc = z.infer<typeof rawLexisrcSchema>;
/**
 * Fully parsed `.lexisrc.json` with resolved env vars.
 */
export declare const lexisrcSchema: z.ZodObject<{
    scope: z.ZodObject<{
        allowed_targets: z.ZodArray<z.ZodString, "many">;
        environment: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        allowed_targets: string[];
        environment: string;
    }, {
        allowed_targets: string[];
        environment: string;
    }>;
    mode: z.ZodEnum<["safe", "aggressive"]>;
    auth: z.ZodObject<{
        profiles: z.ZodRecord<z.ZodString, z.ZodObject<{
            type: z.ZodEnum<["bearer", "api_key", "basic"]>;
            token: z.ZodString;
            role: z.ZodEnum<["standard", "admin"]>;
            owns: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>;
    }, {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>;
    }>;
    ai: z.ZodObject<{
        provider: z.ZodEnum<["openai", "deepseek", "anthropic", "ollama", "lmstudio"]>;
        redact_target: z.ZodBoolean;
        local_fallback: z.ZodBoolean;
        model: z.ZodString;
        api_key: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        api_key: string;
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        redact_target: boolean;
        local_fallback: boolean;
        model: string;
    }, {
        api_key: string;
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        redact_target: boolean;
        local_fallback: boolean;
        model: string;
    }>;
    limits: z.ZodObject<{
        max_concurrent_requests: z.ZodNumber;
        max_requests_per_test: z.ZodNumber;
        abort_on_latency_degradation_pct: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        max_concurrent_requests: number;
        max_requests_per_test: number;
        abort_on_latency_degradation_pct: number;
    }, {
        max_concurrent_requests: number;
        max_requests_per_test: number;
        abort_on_latency_degradation_pct: number;
    }>;
}, "strip", z.ZodTypeAny, {
    scope: {
        allowed_targets: string[];
        environment: string;
    };
    mode: "safe" | "aggressive";
    auth: {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>;
    };
    ai: {
        api_key: string;
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        redact_target: boolean;
        local_fallback: boolean;
        model: string;
    };
    limits: {
        max_concurrent_requests: number;
        max_requests_per_test: number;
        abort_on_latency_degradation_pct: number;
    };
}, {
    scope: {
        allowed_targets: string[];
        environment: string;
    };
    mode: "safe" | "aggressive";
    auth: {
        profiles: Record<string, {
            type: "bearer" | "api_key" | "basic";
            token: string;
            role: "standard" | "admin";
            owns: string[];
        }>;
    };
    ai: {
        api_key: string;
        provider: "openai" | "deepseek" | "anthropic" | "ollama" | "lmstudio";
        redact_target: boolean;
        local_fallback: boolean;
        model: string;
    };
    limits: {
        max_concurrent_requests: number;
        max_requests_per_test: number;
        abort_on_latency_degradation_pct: number;
    };
}>;
export type Lexisrc = z.infer<typeof lexisrcSchema>;
//# sourceMappingURL=lexisrc-schema.d.ts.map