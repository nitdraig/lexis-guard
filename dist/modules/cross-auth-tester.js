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
function getAuthHeader(profile) {
    switch (profile.type) {
        case 'bearer':
            return { Authorization: `Bearer ${profile.token}` };
        case 'api_key':
            return { 'X-API-Key': profile.token };
        case 'basic':
            return { Authorization: `Basic ${Buffer.from(profile.token).toString('base64')}` };
        default: {
            const _exhaustive = profile.type;
            throw new Error(`Unsupported auth type: ${_exhaustive}`);
        }
    }
}
/**
 * BOLA (Broken Object Level Authorization) test:
 * User A tries to access resources owned by User B.
 * If the server returns 200, it's a BOLA violation.
 */
export async function testBOLA(_target, config, engine) {
    const findings = [];
    const profiles = Object.entries(config.auth.profiles);
    const standardProfiles = profiles.filter(([, p]) => p.role === 'standard');
    // lexis: need at least 2 standard profiles with disjoint owns
    if (standardProfiles.length < 2) {
        return findings;
    }
    // Build a map: profile_name -> owned resources
    const ownershipMap = new Map();
    for (const [name, profile] of standardProfiles) {
        ownershipMap.set(name, profile.owns);
    }
    // Test: each user tries to access every other user's resources
    for (const [attackerName, attackerProfile] of standardProfiles) {
        const attackerHeaders = getAuthHeader(attackerProfile);
        for (const [victimName, victimProfile] of standardProfiles) {
            if (attackerName === victimName)
                continue;
            for (const resource of victimProfile.owns) {
                // lexis: assume resource format like "order:1001" -> path /orders/1001
                // This is heuristic; real paths should be mapped by caller or config.
                const [resourceType, resourceId] = resource.split(':');
                const path = `/${resourceType}s/${resourceId}`;
                try {
                    const resp = await engine.fetch(path, 'GET', attackerHeaders);
                    if (resp.statusCode >= 200 && resp.statusCode < 300) {
                        findings.push(finding('BOLA_ACCESS_CROSS_USER', 'GET', path, `BOLA: ${attackerName} accessed ${victimName}'s resource ${resource}`, 'high', `Request with ${attackerName} token to ${path} returned ${resp.statusCode}. ` +
                            `Expected 403/404.`, 'CWE-639', 7.5));
                    }
                }
                catch {
                    // lexis: ignore connection errors on cross-auth probes
                }
            }
        }
    }
    return findings;
}
/**
 * BFLA (Broken Function Level Authorization) test:
 * Standard user tries to perform admin-only operations.
 * If the server accepts the request, it's a BFLA violation.
 */
export async function testBFLA(_target, config, engine) {
    const findings = [];
    const profiles = Object.entries(config.auth.profiles);
    const standardProfiles = profiles.filter(([, p]) => p.role === 'standard');
    const adminProfiles = profiles.filter(([, p]) => p.role === 'admin');
    if (adminProfiles.length === 0 || standardProfiles.length === 0) {
        return findings;
    }
    // lexis: heuristic admin endpoints. In practice these should be discovered
    // from OpenAPI spec or config. Using common patterns for MVP.
    const adminPaths = ['/admin/users', '/admin/roles', '/admin/config'];
    for (const [stdName, stdProfile] of standardProfiles) {
        const headers = getAuthHeader(stdProfile);
        for (const path of adminPaths) {
            try {
                const resp = await engine.fetch(path, 'GET', headers);
                if (resp.statusCode >= 200 && resp.statusCode < 300) {
                    findings.push(finding('BFLA_ADMIN_ACCESS', 'GET', path, `BFLA: standard user ${stdName} accessed admin endpoint ${path}`, 'critical', `Request with standard role token returned ${resp.statusCode}. ` +
                        `Expected 403.`, 'CWE-285', 9.0));
                }
            }
            catch {
                // lexis: ignore connection errors on BFLA probes
            }
        }
    }
    return findings;
}
//# sourceMappingURL=cross-auth-tester.js.map