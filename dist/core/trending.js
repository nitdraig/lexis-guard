import { readFileSync } from 'node:fs';
/**
 * Read audit log entries from file.
 */
function readLogEntries(logPath) {
    try {
        const raw = readFileSync(logPath, 'utf-8');
        return raw
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
    }
    catch {
        return [];
    }
}
/**
 * Compare current findings against the most recent previous run
 * for the same target. Returns trending information.
 */
export function computeTrend(currentFindings, logPath, target) {
    const entries = readLogEntries(logPath);
    // Find the most recent previous run for the same target
    const previous = entries
        .filter((e) => e.target === target)
        .pop();
    if (!previous) {
        return {
            resolved: [],
            new: currentFindings.map((f) => f.hash),
            persistent: [],
            previousRunAt: null,
            previousCount: 0,
            currentCount: currentFindings.length
        };
    }
    // lexis: audit log does not store full findings, only counts.
    // For true diff we would need a separate findings database.
    // Here we do a coarse trend based on counts only.
    return {
        resolved: [],
        new: [],
        persistent: [],
        previousRunAt: previous.timestamp,
        previousCount: previous.findings_count,
        currentCount: currentFindings.length
    };
}
//# sourceMappingURL=trending.js.map