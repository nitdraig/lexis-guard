import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { Lexisignore } from '../config/lexisignore-schema.js';
import type { ReportMeta } from '../reporter/reporter.js';
import { deduplicate, type DedupedFinding } from './deduplicator.js';
import { Sanitizer } from './sanitizer.js';
import { mapOwaspCategories } from '../reporter/owasp-mapping.js';
import { withRiskScore } from './risk-score.js';
import { createAIRouter, type AiConfigSource } from '../ai/factory.js';
import type { SynthesisOutput } from '../ai/ai-provider.js';

export interface AuditPipelineInput {
  /** Raw findings straight from the audit modules. */
  findings: Finding[];
  /** Resolved `.lexisrc` — supplies scope for sanitization and AI config. */
  config: Lexisrc;
  /** Target as seen by the user; canonicalized by the caller before this point. */
  target: string;
  /** Wall-clock duration of the audit. */
  durationMs: number;
  /** True when the engine aborted (circuit breaker) before finishing. */
  incomplete?: boolean;
  /** Optional `.lexisignore` suppressions applied before AI/reporting. */
  lexisignore?: Lexisignore | null;
  /** When present, runs AI triage + synthesis; otherwise synthesis is null. */
  ai?: AiConfigSource;
}

export interface AuditPipelineResult {
  /** Deduplicated, sanitized, non-suppressed findings. */
  findings: DedupedFinding[];
  /** Findings removed by `.lexisignore` (available for reports). */
  suppressed: DedupedFinding[];
  /** AI synthesis, or null when no AI config was supplied. */
  synthesis: SynthesisOutput | null;
  /** Standard report metadata. */
  meta: ReportMeta;
}

/**
 * Shared post-module audit pipeline. One function owns dedupe → sanitize →
 * apply suppressions → AI annotation for BOTH the CLI one-shot and the TUI.
 * Changing dedup/sanitization/triage behavior means editing this module only.
 */
export async function runAuditPipeline(input: AuditPipelineInput): Promise<AuditPipelineResult> {
  const deduped = deduplicate(input.findings);
  const sanitizer = new Sanitizer(input.config.scope.allowed_targets);
  const sanitized = deduped.map((f) => sanitizer.sanitizeFinding(f));
  const mapped = mapOwaspCategories(sanitized);
  const scored = withRiskScore(mapped);

  const ignoredHashes = new Set((input.lexisignore?.ignore ?? []).map((e) => e.hash));
  const findings = scored.filter((f) => !ignoredHashes.has(f.hash));
  const suppressed = scored.filter((f) => ignoredHashes.has(f.hash));

  const meta: ReportMeta = {
    target: input.target,
    mode: input.config.mode,
    timestamp: new Date().toISOString(),
    durationMs: input.durationMs,
    incomplete: input.incomplete ?? false
  };

  let synthesis: SynthesisOutput | null = null;
  if (input.ai) {
    const aiRouter = createAIRouter(input.ai);
    await aiRouter.triage(findings);
    synthesis = await aiRouter.synthesize(findings);
  }

  return { findings, suppressed, synthesis, meta };
}