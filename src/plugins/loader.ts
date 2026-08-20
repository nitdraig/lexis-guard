import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { AuditPlugin } from './plugin-types.js';
import type { PluginRegistry } from './registry.js';

/**
 * Loads plugin manifests from the local marketplace and exposes them for
 * registration. Actual code loading is left for a versioned plugin format;
 * this loader only validates the manifest shape so the registry can surface
 * installed plugins without executing untrusted code.
 */
export function listInstalledPlugins(root?: string): Array<{ id: string; version: string }> {
  const pluginsRoot = root ?? join(homedir(), '.lexisguard', 'plugins');
  if (!existsSync(pluginsRoot)) return [];

  const result: Array<{ id: string; version: string }> = [];
  for (const name of readdirSync(pluginsRoot)) {
    const manifestPath = join(pluginsRoot, name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
        id?: string;
        version?: string;
      };
      if (manifest.id && manifest.version) {
        result.push({ id: manifest.id, version: manifest.version });
      }
    } catch {
      // lexis: malformed manifest is skipped, never fatal
    }
  }
  return result;
}

/** Register all installed plugin manifests into a registry (metadata only). */
export function registerInstalledPlugins(registry: PluginRegistry, root?: string): void {
  for (const { id, version } of listInstalledPlugins(root)) {
    const placeholder: AuditPlugin = {
      id,
      name: id,
      version,
      protocol: 'http',
      run: async () => []
    };
    try {
      registry.register(placeholder);
    } catch {
      // lexis: duplicate id — a built-in wins over a same-id installed plugin
    }
  }
}
