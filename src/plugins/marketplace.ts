import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface MarketplaceEntry {
  id: string;
  version: string;
  installed: boolean;
}

/**
 * Local plugin marketplace. Manages plugin install manifests under
 * `~/.lexisguard/plugins/` without any network calls. This keeps the Fase
 * Futura marketplace deterministic, safe and self-contained.
 */
export class PluginMarketplace {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? join(homedir(), '.lexisguard', 'plugins');
    this.ensureRoot();
  }

  getRoot(): string {
    return this.root;
  }

  /** Persist a plugin manifest (the plugin is expected to be self-contained). */
  install(id: string, version: string, source: string): void {
    const dir = join(this.root, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ id, version, source }, null, 2),
      'utf-8'
    );
  }

  remove(id: string): void {
    rmSync(join(this.root, id), { recursive: true, force: true });
  }

  list(): MarketplaceEntry[] {
    const entries: MarketplaceEntry[] = [];
    for (const name of readdirSync(this.root)) {
      const manifestPath = join(this.root, name, 'manifest.json');
      if (!existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
          id?: string;
          version?: string;
        };
        entries.push({
          id: manifest.id ?? name,
          version: manifest.version ?? 'unknown',
          installed: true
        });
      } catch {
        // lexis: skip malformed manifests
      }
    }
    return entries.sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  private ensureRoot(): void {
    if (!existsSync(this.root)) {
      mkdirSync(this.root, { recursive: true });
    }
  }
}
