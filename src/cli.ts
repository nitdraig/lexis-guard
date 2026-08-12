#!/usr/bin/env node
import 'dotenv/config';
import { Command } from '@commander-js/extra-typings';
import { loadConfig, loadRawConfig } from './config/loader.js';
import { parseLexisrcStrict } from './config/lexisrc-parser.js';
import { loadLexisignore } from './config/lexisignore-loader.js';
import { defaultRawLexisrc } from './config/default.js';
import { validateScope, canonicalizeTarget } from './core/scope-guard.js';
import { HttpEngine } from './core/http-engine.js';
import { discoverEndpoints, type Endpoint } from './openapi/parser.js';
import { SecurityModule } from './modules/security-module.js';
import { PerformanceModule } from './modules/performance-module.js';
import { ScalabilityModule } from './modules/scalability-module.js';
import { runAuditPipeline } from './core/audit-pipeline.js';
import { resolveAuthProfiles } from './core/auth-guard.js';
import { JsonReporter } from './reporter/json-reporter.js';
import { MarkdownReporter } from './reporter/markdown-reporter.js';
import { SarifReporter } from './reporter/sarif-reporter.js';
import { AuditLog } from './core/audit-log.js';
import { computeTrend } from './core/trending.js';
import { startTUI } from './tui/index.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const program = new Command()
  .name('lexisg')
  .description('Automated API security, performance and scalability auditing orchestrator')
  .version('0.1.0')
  .option('-c, --config <path>', 'path to the configuration file')
  .option('-m, --mode <mode>', 'execution mode: safe or aggressive')
  .option('-t, --target <url>', 'base URL of the API to audit (one-shot)')
  .option('-s, --spec <path>', 'path or URL to an OpenAPI/Swagger spec')
  .option('-f, --format <format>', 'report format: json, md, sarif', 'json')
  .option('-o, --output <path>', 'output path for the report')
  .option('--json', 'JSON output to stdout (alias for --format json --output -)')
  .option('--tui', 'open the interactive workbench (multi-screen)')
  .option('--threshold <score>', 'minimum CVSS score for exit code 1', '7.0')
  .parse();

const options = program.opts();

async function main(): Promise<number> {
  const t0 = Date.now();

  // Workbench TUI: sin flags o con --tui (con target opcional preseleccionado)
  const workbench = options.tui || !options.target;
  if (workbench) {
    if (!process.stdin.isTTY) {
      console.error('The interactive workbench requires a terminal. Use --target for a one-shot audit.');
      return 2;
    }
    let rawConfig;
    let configPath: string | null = null;
    try {
      rawConfig = loadRawConfig(options.config);
      configPath = options.config ?? null;
    } catch {
      rawConfig = defaultRawLexisrc();
    }
    await startTUI({
      target: options.target,
      rawConfig,
      configPath
    });
    return 0;
  }

  // One-shot audit (CI-friendly)
  let target = options.target as string;
  let config = loadConfig(options.config);
  const format: 'json' | 'md' | 'sarif' = (options.format as 'json' | 'md' | 'sarif') ?? 'json';
  const outputPath: string | undefined = options.output;

  const modeOverride = options.mode as 'safe' | 'aggressive' | undefined;
  if (modeOverride) {
    config = parseLexisrcStrict({ ...config, mode: modeOverride });
  }

  // Scope Guard
  const scopeResult = validateScope(target, config);
  if (!scopeResult.ok) {
    console.error(`Error: ${scopeResult.reason}`);
    return 1;
  }

  // Canonicalize once; the engine and every module share the absolute URL.
  const canonical = canonicalizeTarget(target);
  if (!canonical.ok) {
    console.error(`Error: ${canonical.reason}`);
    return 1;
  }
  const baseUrl = canonical.url;

  // Auth Guard: BOLA/BFLA prerequisites. Not fatal — the cross-auth module
  // skips those checks on its own; the warning surfaces why they are absent.
  const authResult = resolveAuthProfiles(config);
  if (!authResult.ok) {
    console.error(`Warning: ${authResult.errors.join(' ')}`);
  }

  // Engine
  const engine = new HttpEngine({
    baseUrl,
    concurrency: config.limits.max_concurrent_requests,
    latencyThresholdMs: 1000,
    abortOnDegradationPct: config.limits.abort_on_latency_degradation_pct,
    maxRequests: config.limits.max_requests_per_test
  });

  // OpenAPI discovery — the spec drives which paths get probed.
  let endpoints: Endpoint[] | undefined;
  if (options.spec) {
    if (/^https?:\/\//i.test(options.spec)) {
      // Scope Guard applies to remote specs too: never fetch outside allowlist.
      const specScope = validateScope(options.spec, config);
      if (!specScope.ok) {
        console.error(`Error: spec host not allowed: ${options.spec}`);
        await engine.close();
        return 1;
      }
    }
    try {
      endpoints = await discoverEndpoints(options.spec);
    } catch (err) {
      console.error(`Error: cannot parse spec ${options.spec}:`, err instanceof Error ? err.message : err);
      await engine.close();
      return 1;
    }
    console.error(`Discovered ${endpoints.length} endpoint(s) from ${options.spec}`);
  }

  // Modulos
  const modules = [new SecurityModule(), new PerformanceModule(), new ScalabilityModule()];
  const allFindings: Awaited<ReturnType<typeof modules[0]['run']>> = [];

  for (const mod of modules) {
    try {
      const findings = await mod.run(baseUrl, config, engine, undefined, endpoints);
      allFindings.push(...findings);
    } catch (err) {
      console.error(`Error in module ${mod.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // Shared post-process pipeline: dedupe → sanitize → ignore → AI
  const lexisignore = loadLexisignore(options.config);
  const { findings, synthesis, meta } = await runAuditPipeline({
    findings: allFindings,
    config,
    target: baseUrl,
    durationMs: Date.now() - t0,
    incomplete: engine.getThrottleState() === 'abort',
    lexisignore,
    ai: config.ai
  });

  // Reporte
  let reporter;
  switch (format) {
    case 'md':
      reporter = new MarkdownReporter();
      break;
    case 'sarif':
      reporter = new SarifReporter();
      break;
    default:
      reporter = new JsonReporter();
  }

  const report = reporter.generate(findings, meta, lexisignore ?? undefined);

  if (outputPath && outputPath !== '-') {
    writeFileSync(resolve(outputPath), report, 'utf-8');
    console.log(`Report saved to ${outputPath}`);
  } else {
    console.log(report);
  }

  // Resumen
  console.error(`\nLexisGuard finished in ${(meta.durationMs / 1000).toFixed(1)}s`);
  console.error(`Findings: ${findings.length} | Posture: ${synthesis?.overall_posture ?? 'n/a'}`);

  // Audit log
  const auditLog = new AuditLog();
  // lexis: count-based trend vs the previous run for this target (audit log stores no finding hashes)
  const trend = computeTrend(findings, auditLog.getPath(), meta.target);
  auditLog.write({
    timestamp: meta.timestamp,
    target: meta.target,
    mode: meta.mode,
    checks: modules.map((m) => m.id),
    findings_count: findings.length,
    incomplete: meta.incomplete
  });

  // Trending summary
  if (trend.previousRunAt) {
    const delta = findings.length - trend.previousCount;
    const sign = delta > 0 ? '+' : '';
    console.error(`Trend vs previous run (${trend.previousRunAt}): ${trend.previousCount} -> ${findings.length} findings (${sign}${delta})`);
  }

  // Exit code
  const threshold = parseFloat(options.threshold ?? '7.0');
  const hasCritical = findings.some((f) => (f.cvss ?? 0) >= threshold || f.worst_case === 'critical');

  await engine.close();
  return hasCritical ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Fatal error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
