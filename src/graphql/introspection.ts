import type { HttpEngine } from '../core/http-engine.js';
import type { GraphQLSchemaSummary } from './schema.js';

const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      kind
      name
      fields {
        name
      }
    }
  }
}`;

interface IntrospectionResponse {
  data?: {
    __schema?: {
      queryType?: { name?: string };
      mutationType?: { name?: string };
      types?: Array<{
        kind?: string;
        name?: string;
        fields?: Array<{ name?: string }> | null;
      }>;
    };
  };
}

/**
 * Attempt a standard GraphQL introspection query against the endpoint.
 * Returns a summary, or an empty summary when the server is not a GraphQL API.
 */
export async function introspect(
  endpoint: string,
  engine: HttpEngine
): Promise<GraphQLSchemaSummary> {
  const summary: GraphQLSchemaSummary = {
    introspectable: false,
    queryFields: [],
    mutationFields: []
  };

  try {
    const resp = await engine.fetch(
      endpoint,
      'POST',
      { 'content-type': 'application/json' },
      JSON.stringify({ query: INTROSPECTION_QUERY })
    );

    let parsed: IntrospectionResponse;
    try {
      parsed = JSON.parse(resp.body) as IntrospectionResponse;
    } catch {
      return summary;
    }

    const schema = parsed.data?.__schema;
    if (!schema) return summary;

    summary.introspectable = true;
    const queryTypeName = schema.queryType?.name;
    const mutationTypeName = schema.mutationType?.name;

    for (const type of schema.types ?? []) {
      if (!type || type.kind !== 'OBJECT') continue;
      if (type.name === queryTypeName) {
        summary.queryFields = (type.fields ?? []).map((f) => f.name ?? '').filter(Boolean);
      }
      if (type.name === mutationTypeName) {
        summary.mutationFields = (type.fields ?? []).map((f) => f.name ?? '').filter(Boolean);
      }
    }
  } catch {
    // lexis: transport errors mean "not introspectable", not a crash
  }

  return summary;
}
