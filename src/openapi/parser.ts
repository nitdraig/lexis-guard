import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI } from 'openapi-types';

export interface Endpoint {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  /** JSON Schema for the 200 response body, when declared in the spec. */
  responseSchema?: unknown;
}

/**
 * Extract the 200 response JSON Schema from an OpenAPI operation, if present.
 */
function extractResponseSchema(operation: OpenAPI.Operation): unknown | undefined {
  const response = operation.responses?.['200'] ?? operation.responses?.['201'];
  if (!response || !('content' in response)) return undefined;
  const jsonContent = response.content?.['application/json'];
  if (!jsonContent?.schema) return undefined;
  return jsonContent.schema;
}

/**
 * Parse an OpenAPI/Swagger spec and extract all HTTP endpoints.
 */
export async function discoverEndpoints(specPathOrUrl: string): Promise<Endpoint[]> {
  const api = (await SwaggerParser.parse(specPathOrUrl)) as OpenAPI.Document;

  const endpoints: Endpoint[] = [];
  const paths = api.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
    for (const method of methods) {
      const operation = pathItem[method as keyof typeof pathItem];
      if (operation && typeof operation === 'object') {
        endpoints.push({
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          responseSchema: extractResponseSchema(operation)
        });
      }
    }
  }

  return endpoints;
}
