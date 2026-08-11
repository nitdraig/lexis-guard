import { intro, outro, text, select, confirm, isCancel } from '@clack/prompts';
import { loadConfig } from './config/loader.js';
/**
 * Interactive wizard when no CLI flags are provided.
 * Returns answers or null if user cancels.
 */
export async function runWizard() {
    intro('LexisGuard CLI');
    const configPathResult = await text({
        message: 'Path to .lexisrc.json (leave empty to search automatically)',
        placeholder: './.lexisrc.json',
        initialValue: ''
    });
    if (isCancel(configPathResult)) {
        outro('Cancelled');
        return null;
    }
    const configPath = typeof configPathResult === 'string' ? configPathResult : '';
    let config;
    try {
        config = loadConfig(configPath || undefined);
    }
    catch (err) {
        outro(`Error loading config: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
    const targetResult = await text({
        message: 'Target to audit',
        placeholder: config.scope.allowed_targets[0] ?? 'https://api.example.com',
        initialValue: config.scope.allowed_targets[0] ?? ''
    });
    if (isCancel(targetResult)) {
        outro('Cancelled');
        return null;
    }
    const target = typeof targetResult === 'string' ? targetResult : '';
    if (target.length === 0 || !target.includes('.')) {
        outro('Invalid target');
        return null;
    }
    const modeResult = await select({
        message: 'Execution mode',
        options: [
            { value: 'safe', label: 'Safe — checks no invasivos (default)' },
            { value: 'aggressive', label: 'Aggressive — fuzzing + stress test' }
        ],
        initialValue: config.mode
    });
    if (isCancel(modeResult)) {
        outro('Cancelled');
        return null;
    }
    const mode = modeResult;
    // lexis: aggressive en produccion requiere confirmacion explicita
    if (mode === 'aggressive' && config.scope.environment === 'production') {
        const confirmed = await confirm({
            message: `You are on PRODUCTION. Confirm aggressive mode for ${target}`,
            initialValue: false
        });
        if (!confirmed || isCancel(confirmed)) {
            outro('Aggressive mode cancelled');
            return null;
        }
    }
    const formatResult = await select({
        message: 'Report format',
        options: [
            { value: 'json', label: 'JSON' },
            { value: 'md', label: 'Markdown' },
            { value: 'sarif', label: 'SARIF' }
        ],
        initialValue: 'json'
    });
    if (isCancel(formatResult)) {
        outro('Cancelled');
        return null;
    }
    const format = formatResult;
    const outputResult = await text({
        message: 'Archivo de salida (dejar vacio para stdout)',
        placeholder: 'report.json',
        initialValue: ''
    });
    if (isCancel(outputResult)) {
        outro('Cancelled');
        return null;
    }
    const output = typeof outputResult === 'string' ? outputResult : '';
    outro('Configuration complete. Starting audit...');
    return {
        target,
        config,
        mode,
        format,
        output: output || undefined
    };
}
//# sourceMappingURL=wizard.js.map