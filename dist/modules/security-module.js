import { generateFindingHash } from '../utils/finding-hash.js';
import { testBOLA, testBFLA } from './cross-auth-tester.js';
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
function headerValue(headers, name) {
    const val = headers[name.toLowerCase()];
    if (Array.isArray(val))
        return val.join(', ');
    return val;
}
/**
 * Security audit module — OWASP Web + API Top 10 checks.
 */
export class SecurityModule {
    id = 'security';
    name = 'Security';
    async run(_target, _config, engine, onFinding) {
        const findings = [];
        // Stream each finding to the UI the moment it is detected.
        const track = (f) => {
            findings.push(f);
            onFinding?.(f);
        };
        // 1. Basic headers on root
        const root = await engine.fetch('/', 'GET');
        const headers = root.headers;
        if (!headerValue(headers, 'strict-transport-security')) {
            track(finding('MISSING_HSTS', 'GET', '/', 'Missing Strict-Transport-Security header', 'medium', 'HSTS header not present in response', 'CWE-319', 5.3));
        }
        if (!headerValue(headers, 'x-frame-options')) {
            track(finding('MISSING_X_FRAME_OPTIONS', 'GET', '/', 'Missing X-Frame-Options header', 'medium', 'Clickjacking protection absent', 'CWE-1021', 5.3));
        }
        if (!headerValue(headers, 'x-content-type-options')) {
            track(finding('MISSING_X_CONTENT_TYPE_OPTIONS', 'GET', '/', 'Missing X-Content-Type-Options header', 'low', 'MIME-sniffing not disabled', 'CWE-693', 3.7));
        }
        if (!headerValue(headers, 'content-security-policy')) {
            track(finding('MISSING_CSP', 'GET', '/', 'Missing Content-Security-Policy header', 'medium', 'CSP not configured', 'CWE-693', 5.3));
        }
        const cors = headerValue(headers, 'access-control-allow-origin');
        if (cors === '*') {
            track(finding('CORS_WILD_CARD', 'GET', '/', 'CORS allows any origin', 'high', 'Access-Control-Allow-Origin: *', 'CWE-942', 7.5));
        }
        const server = headerValue(headers, 'server');
        const poweredBy = headerValue(headers, 'x-powered-by');
        if (server || poweredBy) {
            track(finding('STACK_LEAK', 'GET', '/', 'Server stack information leaked', 'low', `Server: ${server ?? 'n/a'}, X-Powered-By: ${poweredBy ?? 'n/a'}`, 'CWE-200', 3.7));
        }
        // 2. Sensitive file exposure (safe mode: HEAD only)
        const sensitivePaths = ['/.env', '/.git/config', '/.htaccess', '/web.config', '/Dockerfile'];
        for (const path of sensitivePaths) {
            try {
                const resp = await engine.fetch(path, 'HEAD');
                if (resp.statusCode === 200) {
                    track(finding('SENSITIVE_FILE_EXPOSURE', 'HEAD', path, `Sensitive file exposed: ${path}`, 'high', `HEAD ${path} returned 200 OK`, 'CWE-538', 7.5));
                }
            }
            catch {
                // lexis: ignore connection errors on non-existent paths
            }
        }
        // 3. JWT detection in response (passive)
        const setCookie = headerValue(headers, 'set-cookie');
        if (setCookie && /jwt|token|auth/i.test(setCookie)) {
            track(finding('JWT_IN_COOKIE', 'GET', '/', 'JWT or auth token detected in cookie', 'info', `Set-Cookie contains token-like value: ${setCookie.slice(0, 40)}...`, 'CWE-522', 2.0));
        }
        // 4. BOLA / BFLA — cross-auth authorization tests
        const bolaFindings = await testBOLA(_target, _config, engine);
        for (const f of bolaFindings)
            track(f);
        const bflaFindings = await testBFLA(_target, _config, engine);
        for (const f of bflaFindings)
            track(f);
        return findings;
    }
}
//# sourceMappingURL=security-module.js.map