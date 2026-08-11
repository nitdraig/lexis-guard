const severityRank = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};
function worse(a, b) {
    return severityRank[a] >= severityRank[b] ? a : b;
}
/**
 * Deduplicates findings by deterministic hash.
 * Returns aggregated findings with count and worst_case severity.
 */
export function deduplicate(findings) {
    const groups = new Map();
    for (const f of findings) {
        const list = groups.get(f.hash) ?? [];
        list.push(f);
        groups.set(f.hash, list);
    }
    const result = [];
    for (const [, list] of groups) {
        const first = list[0];
        let worst = first.severity;
        for (const f of list) {
            worst = worse(worst, f.severity);
        }
        result.push({
            ...first,
            count: list.length,
            worst_case: worst
        });
    }
    return result;
}
//# sourceMappingURL=deduplicator.js.map