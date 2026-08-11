import { generateFindingHash } from '../utils/finding-hash.js';
function finding(ruleId, method, path, description, severity, evidence, cwe, cvss) {
    return {
        hash: generateFindingHash(ruleId, path, method),
        rule_id: ruleId,
        method,
        path,
        description,
        severity,
        evidence,
        cwe,
        cvss
    };
}
/**
 * Performance audit module — latency, payload, protocol support.
 */
export class PerformanceModule {
    id = 'performance';
    name = 'Performance';
    async run(target, _config, engine, onFinding) {
        const findings = [];
        // Stream each finding to the UI the moment it is detected.
        const track = (f) => {
            findings.push(f);
            onFinding?.(f);
        };
        // 1. Baseline latency on root
        const resp = await engine.fetch('/', 'GET');
        const { latency } = resp;
        if (latency.total > 2000) {
            track(finding('HIGH_LATENCY', 'GET', '/', 'Total response time exceeds 2s', 'medium', `Total: ${latency.total.toFixed(0)}ms, TTFB: ${latency.ttfb.toFixed(0)}ms`, undefined, 4.0));
        }
        if (latency.ttfb > 1000) {
            track(finding('HIGH_TTFB', 'GET', '/', 'Time to first byte exceeds 1s', 'medium', `TTFB: ${latency.ttfb.toFixed(0)}ms`, undefined, 4.0));
        }
        // 2. Payload efficiency: detect large JSON without compression
        const contentLength = parseInt(resp.headers['content-length'] ?? '0', 10);
        const contentEncoding = resp.headers['content-encoding'] ?? '';
        if (contentLength > 50_000 && !contentEncoding) {
            track(finding('UNCOMPRESSED_LARGE_PAYLOAD', 'GET', '/', 'Large response not compressed', 'low', `Content-Length: ${contentLength} bytes, no Content-Encoding`, undefined, 3.0));
        }
        // 3. HTTP/2 support probe (simple)
        // lexis: undici auto-negotiates HTTP/2 with connect({ protocol: 'https:' })
        // We flag if target uses HTTP/1.1 only on HTTPS.
        if (target.startsWith('https://')) {
            const via = resp.headers['via'] ?? '';
            if (via.includes('1.1')) {
                track(finding('HTTP2_NOT_SUPPORTED', 'GET', '/', 'HTTP/2 not detected', 'info', 'Server responded via HTTP/1.1', undefined, 1.0));
            }
        }
        return findings;
    }
}
//# sourceMappingURL=performance-module.js.map