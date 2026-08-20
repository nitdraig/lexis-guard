/**
 * Minimal GraphQL schema summary derived from an introspection response.
 * We keep only what the audit module needs; the full SDL is intentionally
 * not reconstructed.
 */
export interface GraphQLSchemaSummary {
  /** True when the server returned a valid `__schema` introspection payload. */
  introspectable: boolean;
  /** Query root fields discovered via introspection. */
  queryFields: string[];
  /** Mutation root fields discovered via introspection. */
  mutationFields: string[];
}
