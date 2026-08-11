export interface Endpoint {
    method: string;
    path: string;
    operationId?: string;
    summary?: string;
}
/**
 * Parse an OpenAPI/Swagger spec and extract all HTTP endpoints.
 */
export declare function discoverEndpoints(specPathOrUrl: string): Promise<Endpoint[]>;
//# sourceMappingURL=parser.d.ts.map