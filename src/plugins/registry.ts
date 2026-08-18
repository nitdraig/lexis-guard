import type { AuditPlugin } from './plugin-types.js';
import type { AuditModule } from '../modules/audit-module.js';
import { SecurityModule } from '../modules/security-module.js';
import { PerformanceModule } from '../modules/performance-module.js';
import { ScalabilityModule } from '../modules/scalability-module.js';
import { InjectionModule } from '../modules/injection-module.js';
import { SsrfModule } from '../modules/ssrf-module.js';
import { JwtModule } from '../modules/jwt-module.js';
import { SecretsScanner } from '../modules/secrets-scanner.js';
import { ContractModule } from '../modules/contract-module.js';

const BUILTIN_VERSION = '1.0.0';

/** Tag a built-in module as an audit plugin without losing its `run` method. */
function asPlugin(module: AuditModule, protocol: AuditPlugin['protocol']): AuditPlugin {
  return Object.assign(module, { version: BUILTIN_VERSION, protocol });
}

/**
 * Built-in audit plugins. Wrapped as `AuditPlugin` so the registry treats core
 * checks and third-party plugins through the same interface.
 */
export function builtinPlugins(): AuditPlugin[] {
  return [
    asPlugin(new SecurityModule(), 'http'),
    asPlugin(new PerformanceModule(), 'http'),
    asPlugin(new ScalabilityModule(), 'http'),
    asPlugin(new InjectionModule(), 'http'),
    asPlugin(new SsrfModule(), 'http'),
    asPlugin(new JwtModule(), 'http'),
    asPlugin(new SecretsScanner(), 'http'),
    asPlugin(new ContractModule(), 'http')
  ];
}

/**
 * Registry of available audit plugins with enabled/disabled filtering.
 * The orchestrator and TUI resolve their module list from here, so new plugins
 * never require editing the core.
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, AuditPlugin>();

  register(plugin: AuditPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin id already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  list(): AuditPlugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Resolve the active module list, applying enabled/disabled filters.
   * An empty `enabled` means "all registered plugins".
   */
  resolve(enabled?: string[], disabled?: string[]): AuditPlugin[] {
    let plugins = this.list();

    if (enabled && enabled.length > 0) {
      plugins = plugins.filter((p) => enabled.includes(p.id));
    }
    if (disabled && disabled.length > 0) {
      plugins = plugins.filter((p) => !disabled.includes(p.id));
    }

    return plugins;
  }
}

let defaultRegistry: PluginRegistry | null = null;

/** Lazily build the process-wide registry seeded with built-ins. */
export function defaultPluginRegistry(): PluginRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new PluginRegistry();
    for (const plugin of builtinPlugins()) {
      defaultRegistry.register(plugin);
    }
  }
  return defaultRegistry;
}
