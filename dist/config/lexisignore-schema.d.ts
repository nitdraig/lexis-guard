import { z } from 'zod';
/**
 * Zod schema for a single ignored finding entry.
 * All fields are required — no silent defaults.
 */
export declare const ignoredFindingSchema: z.ZodObject<{
    hash: z.ZodString;
    rule_id: z.ZodString;
    path: z.ZodString;
    method: z.ZodString;
    reason: z.ZodString;
    approved_by: z.ZodString;
    expires: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    path: string;
    reason: string;
    hash: string;
    rule_id: string;
    method: string;
    approved_by: string;
    expires: string;
}, {
    path: string;
    reason: string;
    hash: string;
    rule_id: string;
    method: string;
    approved_by: string;
    expires: string;
}>;
export type IgnoredFinding = z.infer<typeof ignoredFindingSchema>;
/**
 * Zod schema for the full `.lexisignore` document.
 */
export declare const lexisignoreSchema: z.ZodObject<{
    ignore: z.ZodArray<z.ZodObject<{
        hash: z.ZodString;
        rule_id: z.ZodString;
        path: z.ZodString;
        method: z.ZodString;
        reason: z.ZodString;
        approved_by: z.ZodString;
        expires: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        reason: string;
        hash: string;
        rule_id: string;
        method: string;
        approved_by: string;
        expires: string;
    }, {
        path: string;
        reason: string;
        hash: string;
        rule_id: string;
        method: string;
        approved_by: string;
        expires: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    ignore: {
        path: string;
        reason: string;
        hash: string;
        rule_id: string;
        method: string;
        approved_by: string;
        expires: string;
    }[];
}, {
    ignore: {
        path: string;
        reason: string;
        hash: string;
        rule_id: string;
        method: string;
        approved_by: string;
        expires: string;
    }[];
}>;
export type Lexisignore = z.infer<typeof lexisignoreSchema>;
//# sourceMappingURL=lexisignore-schema.d.ts.map