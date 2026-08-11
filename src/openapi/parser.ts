import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI } from 'openapi-types';

export interface Endpoint {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
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
          summary: operation.summary
        });
      }
    }
  }

  return endpoints;
}
