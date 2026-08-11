import { Command } from '@commander-js/extra-typings';
import { loadConfig } from './config/loader.js';
import { parseLexisrcStrict } from './config/lexisrc-parser.js';
import { validateScope } from './core/scope-guard.js';
import { HttpEngine } from './core/http-engine.js';
import { SecurityModule } from './modules/security-module.js';
import { PerformanceModule } from './modules/performance-module.js';
import { ScalabilityModule } from './modules/scalability-module.js';
import { deduplicate } from './core/deduplicator.js';
import { Sanitizer } from './core/sanitizer.js';
import { JsonReporter } from './reporter/json-reporter.js';
import { MarkdownReporter } from './reporter/markdown-reporter.js';
import { SarifReporter } from './reporter/sarif-reporter.js';
import { LocalProvider } from './ai/local-provider.js';
import { AIRouter } from './ai/ai-router.js';
import { AuditLog } from './core/audit-log.js';
import { runWizard } from './wizard.js';
import { startTUI } from './tui/index.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const program = new Command()
  .name('lexisguard')
  .description('Orchestrator TUI de auditoria automatizada para APIs')
  .version('0.1.0')
  .option('-c, --config <path>', 'ruta al archivo de configuracion')
  .option('-m, --mode <mode>', 'modo de ejecucion: safe o aggressive')
  .option('-t, --target <url>', 'URL base del API a auditar')
  .option('-s, --spec <path>', 'ruta o URL al spec OpenAPI/Swagger')
  .option('-f, --format <format>', 'formato de reporte: json, md, sarif', 'json')
  .option('-o, --output <path>', 'ruta de salida del reporte')
  .option('--json', 'salida JSON a stdout (alias de --format json --output -)')
  .option('--tui', 'modo dashboard interactivo en terminal')
  .option('--threshold <score>', 'puntuacion CVSS minima para exit code 1', '7.0')
  .parse();

const options = program.opts();

async function main(): Promise<number> {
  const t0 = Date.now();

  // Detectar modo interactivo si no hay target
  let target: string;
  let config: Awaited<ReturnType<typeof loadConfig>>;
  let modeOverride: 'safe' | 'aggressive' | undefined;
  let format: 'json' | 'md' | 'sarif' = (options.format as 'json' | 'md' | 'sarif') ?? 'json';
  let outputPath: string | undefined = options.output;

  if (!options.target) {
    const wizard = await runWizard();
    if (!wizard) return 1;
    target = wizard.target;
    config = wizard.config;
    modeOverride = wizard.mode;
    format = wizard.format;
    outputPath = wizard.output;
  } else {
    config = loadConfig(options.config);
    target = options.target;
    modeOverride = options.mode as 'safe' | 'aggressive' | undefined;
  }

  if (modeOverride) {
    config = parseLexisrcStrict({ ...config, mode: modeOverride });
  }

  // Scope Guard
  const scopeResult = validateScope(target, config);
  if (!scopeResult.ok) {
    console.error(`Error: ${scopeResult.reason}`);
    return 1;
  }

  // TUI mode
  if (options.tui) {
    startTUI(target, config);
    return 0;
  }

  // Engine
  const engine = new HttpEngine({
    baseUrl: target,
    concurrency: config.limits.max_concurrent_requests,
    latencyThresholdMs: 1000,
    abortOnDegradationPct: config.limits.abort_on_latency_degradation_pct
  });

  // Modulos
  const modules = [new SecurityModule(), new PerformanceModule(), new ScalabilityModule()];
  const allFindings: Awaited<ReturnType<typeof modules[0]['run']>> = [];

  for (const mod of modules) {
    try {
      const findings = await mod.run(target, config, engine);
      allFindings.push(...findings);
    } catch (err) {
      console.error(`Error en modulo ${mod.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // Deduplicar + Sanitizar
  const deduped = deduplicate(allFindings);
  const sanitizer = new Sanitizer(config.scope.allowed_targets);
  const sanitized = deduped.map((f) => sanitizer.sanitizeFinding(f));

  // IA
  const aiRouter = new AIRouter(new LocalProvider(), new LocalProvider());
  await aiRouter.triage(sanitized);
  const synthesis = await aiRouter.synthesize(sanitized);

  // Reporte
  const meta = {
    target,
    mode: config.mode,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - t0,
    incomplete: engine.getThrottleState() === 'abort'
  };

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

  const report = reporter.generate(sanitized, meta);

  if (outputPath && outputPath !== '-') {
    writeFileSync(resolve(outputPath), report, 'utf-8');
    console.log(`Reporte guardado en ${outputPath}`);
  } else {
    console.log(report);
  }

  // Resumen
  console.error(`\nLexisGuard completado en ${(meta.durationMs / 1000).toFixed(1)}s`);
  console.error(`Findings: ${sanitized.length} | Postura: ${synthesis.overall_posture}`);

  // Audit log
  const auditLog = new AuditLog();
  auditLog.write({
    timestamp: meta.timestamp,
    target,
    mode: config.mode,
    checks: modules.map((m) => m.id),
    findings_count: sanitized.length,
    incomplete: meta.incomplete
  });

  // Exit code
  const threshold = parseFloat(options.threshold ?? '7.0');
  const hasCritical = sanitized.some((f) => (f.cvss ?? 0) >= threshold || f.worst_case === 'critical');

  await engine.close();
  return hasCritical ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Error fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
