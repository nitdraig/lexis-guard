import {
  intro,
  outro,
  text,
  select,
  confirm,
  isCancel
} from '@clack/prompts';
import { loadConfig } from './config/loader.js';
import type { Lexisrc } from './config/lexisrc-schema.js';

export interface WizardAnswers {
  target: string;
  config: Lexisrc;
  mode: 'safe' | 'aggressive';
  format: 'json' | 'md' | 'sarif';
  output?: string;
}

/**
 * Interactive wizard when no CLI flags are provided.
 * Returns answers or null if user cancels.
 */
export async function runWizard(): Promise<WizardAnswers | null> {
  intro('LexisGuard CLI');

  const configPathResult = await text({
    message: 'Ruta a .lexisrc.json (dejar vacio para buscar automaticamente)',
    placeholder: './.lexisrc.json',
    initialValue: ''
  });

  if (isCancel(configPathResult)) {
    outro('Cancelado');
    return null;
  }
  const configPath = typeof configPathResult === 'string' ? configPathResult : '';

  let config: Lexisrc;
  try {
    config = loadConfig(configPath || undefined);
  } catch (err) {
    outro(`Error cargando config: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const targetResult = await text({
    message: 'Target a auditar',
    placeholder: config.scope.allowed_targets[0] ?? 'https://api.example.com',
    initialValue: config.scope.allowed_targets[0] ?? ''
  });

  if (isCancel(targetResult)) {
    outro('Cancelado');
    return null;
  }
  const target = typeof targetResult === 'string' ? targetResult : '';
  if (target.length === 0 || !target.includes('.')) {
    outro('Target invalido');
    return null;
  }

  const modeResult = await select({
    message: 'Modo de ejecucion',
    options: [
      { value: 'safe' as const, label: 'Safe — checks no invasivos (default)' },
      { value: 'aggressive' as const, label: 'Aggressive — fuzzing + stress test' }
    ],
    initialValue: config.mode
  });

  if (isCancel(modeResult)) {
    outro('Cancelado');
    return null;
  }
  const mode = modeResult as 'safe' | 'aggressive';

  // lexis: aggressive en produccion requiere confirmacion explicita
  if (mode === 'aggressive' && config.scope.environment === 'production') {
    const confirmed = await confirm({
      message: `Estas en PRODUCCION. Confirmar modo aggressive para ${target}`,
      initialValue: false
    });

    if (!confirmed || isCancel(confirmed)) {
      outro('Modo aggressive cancelado');
      return null;
    }
  }

  const formatResult = await select({
    message: 'Formato de reporte',
    options: [
      { value: 'json' as const, label: 'JSON' },
      { value: 'md' as const, label: 'Markdown' },
      { value: 'sarif' as const, label: 'SARIF' }
    ],
    initialValue: 'json'
  });

  if (isCancel(formatResult)) {
    outro('Cancelado');
    return null;
  }
  const format = formatResult as 'json' | 'md' | 'sarif';

  const outputResult = await text({
    message: 'Archivo de salida (dejar vacio para stdout)',
    placeholder: 'report.json',
    initialValue: ''
  });

  if (isCancel(outputResult)) {
    outro('Cancelado');
    return null;
  }
  const output = typeof outputResult === 'string' ? outputResult : '';

  outro('Configuracion completa. Iniciando auditoria...');

  return {
    target,
    config,
    mode,
    format,
    output: output || undefined
  };
}
