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
import { defaultPluginRegistry } from './plugins/registry.js';
import { EscalationGate } from './core/escalation-gate.js';
import { runAuditPipeline } from './core/audit-pipeline.js';
import { resolveAuthProfiles } from './core/auth-guard.js';
import { JsonReporter } from './reporter/json-reporter.js';
import { MarkdownReporter } from './reporter/markdown-reporter.js';
import { SarifReporter } from './reporter/sarif-reporter.js';
import { HtmlReporter } from './reporter/html-reporter.js';
import { AuditLog } from './core/audit-log.js';
import { computeTrend } from './core/trending.js';
import { compareSessions } from './core/regression.js';
import { startTUI } from './tui/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const program = new Command()
  .name('lexisg')
  .description('Automated API security, performance and scalability auditing orchestrator')
  .version('0.1.0')
  .option('-c, --config <path>', 'path to the configuration file')
  .option('-m, --mode <mode>', 'execution mode: safe or aggressive')
  .option('-t, --target <url>', 'base URL of the API to audit (one-shot)')
  .option('-s, --spec <path>', 'path or URL to an OpenAPI/Swagger spec')
  .option('-f, --format <format>', 'report format: json, md, sarif, html', 'json')
  .option('-o, --output <path>', 'output path for the report')
  .option('--json', 'JSON output to stdout (alias for --format json --output -)')
  .option('--tui', 'open the interactive workbench (multi-screen)')
  .option('--threshold <score>', 'minimum CVSS score for exit code 1', '7.0')
  .option('--allow-exploitation', 'run gated modules that send mutating or potentially destructive payloads')
  .option('--completion <shell>', 'print shell completion script (bash, zsh, fish, powershell)')
  .parse();

const options = program.opts();

const COMPLETION_FILES: Record<string, string> = {
  bash: 'lexisguard.bash',
  zsh: 'lexisguard.zsh',
  fish: 'lexisguard.fish',
  powershell: '_lexisguard.ps1',
  pwsh: '_lexisguard.ps1'
};

function printCompletion(shell: string): number {
  const fileName = COMPLETION_FILES[shell];
  if (!fileName) {
    console.error(`Unknown shell "${shell}". Expected one of: bash, zsh, fish, powershell.`);
    return 2;
  }
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'completions', fileName);
  try {
    process.stdout.write(readFileSync(file, 'utf-8'));
    return 0;
  } catch {
    console.error(`Completion script not found: ${fileName}`);
    return 2;
  }
}

async function main(): Promise<number> {
  if (options.completion) {
    return printCompletion(options.completion as string);
  }

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
  const format: 'json' | 'md' | 'sarif' | 'html' = (options.format as 'json' | 'md' | 'sarif' | 'html') ?? 'json';
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

  // Modulos — gated modules (injection / SSRF) only run with --allow-exploitation.
  const modules = defaultPluginRegistry().resolve(
    config.plugins.enabled,
    config.plugins.disabled
  );
  const escalationGate = new EscalationGate(options.allowExploitation === true);
  const allFindings: Awaited<ReturnType<typeof modules[0]['run']>> = [];

  for (const mod of modules) {
    if (mod.requiresEscalation && !escalationGate.isAllowed(mod.id)) {
      console.error(`Skipped ${mod.name}: requires --allow-exploitation`);
      continue;
    }
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
    case 'html':
      reporter = new HtmlReporter();
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

  // Persist the full sanitized session so future runs can diff against it.
  auditLog.saveSession(meta, findings);

  // Trending summary
  if (trend.previousRunAt) {
    const delta = findings.length - trend.previousCount;
    const sign = delta > 0 ? '+' : '';
    console.error(`Trend vs previous run (${trend.previousRunAt}): ${trend.previousCount} -> ${findings.length} findings (${sign}${delta})`);
  }

  // Regression vs the previous saved session for this target (hash-based).
  const previousSession = new AuditLog()
    .listSessions()
    .find((s) => s.meta.target === meta.target && s.meta.timestamp !== meta.timestamp);
  if (previousSession) {
    const regression = compareSessions(previousSession, findings);
    console.error(`Regression: ${regression.resolved.length} resolved, ${regression.new.length} new, ${regression.persistent.length} persistent`);
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
