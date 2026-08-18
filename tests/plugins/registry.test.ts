import { describe, it, expect } from 'vitest';
import { PluginRegistry, builtinPlugins, defaultPluginRegistry } from '../../src/plugins/registry.js';
import type { AuditPlugin } from '../../src/plugins/plugin-types.js';

function plugin(id: string): AuditPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    protocol: 'http',
    run: async () => []
  };
}

describe('PluginRegistry', () => {
  it('registers and lists plugins', () => {
    const registry = new PluginRegistry();
    registry.register(plugin('a'));
    registry.register(plugin('b'));
    expect(registry.list().map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('rejects duplicate ids', () => {
    const registry = new PluginRegistry();
    registry.register(plugin('a'));
    expect(() => registry.register(plugin('a'))).toThrow(/already registered/);
  });

  it('resolves all plugins when no filters are provided', () => {
    const registry = new PluginRegistry();
    registry.register(plugin('a'));
    registry.register(plugin('b'));
    expect(registry.resolve().map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('applies enabled and disabled filters', () => {
    const registry = new PluginRegistry();
    registry.register(plugin('a'));
    registry.register(plugin('b'));
    registry.register(plugin('c'));
    expect(registry.resolve(['a', 'b'], ['b']).map((p) => p.id)).toEqual(['a']);
  });

  it('default registry seeds the built-in modules', () => {
    const registry = defaultPluginRegistry();
    const ids = registry.list().map((p) => p.id);
    expect(ids).toContain('security');
    expect(ids).toContain('injection');
    expect(ids).toContain('contract');
  });

  it('built-in plugins implement run and carry a version', () => {
    for (const p of builtinPlugins()) {
      expect(p.version).toBeTruthy();
      expect(typeof p.run).toBe('function');
    }
  });
});
