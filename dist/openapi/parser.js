import SwaggerParser from '@apidevtools/swagger-parser';
/**
 * Parse an OpenAPI/Swagger spec and extract all HTTP endpoints.
 */
export async function discoverEndpoints(specPathOrUrl) {
    const api = (await SwaggerParser.parse(specPathOrUrl));
    const endpoints = [];
    const paths = api.paths ?? {};
    for (const [path, pathItem] of Object.entries(paths)) {
        if (!pathItem)
            continue;
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
        for (const method of methods) {
            const operation = pathItem[method];
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
//# sourceMappingURL=parser.js.map