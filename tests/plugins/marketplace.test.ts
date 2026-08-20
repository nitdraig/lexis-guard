import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginMarketplace } from '../../src/plugins/marketplace.js';
import { listInstalledPlugins } from '../../src/plugins/loader.js';

describe('PluginMarketplace', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lexisguard-marketplace-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('installs, lists and removes a plugin manifest', () => {
    const marketplace = new PluginMarketplace(root);
    marketplace.install('my-plugin', '1.0.0', 'local');

    expect(marketplace.list()).toEqual([
      { id: 'my-plugin', version: '1.0.0', installed: true }
    ]);

    marketplace.remove('my-plugin');
    expect(marketplace.list()).toEqual([]);
  });

  it('loader discovers installed plugin manifests', () => {
    const marketplace = new PluginMarketplace(root);
    marketplace.install('my-plugin', '2.0.0', 'local');

    const installed = listInstalledPlugins(root);
    expect(installed).toEqual([{ id: 'my-plugin', version: '2.0.0' }]);
  });
});
