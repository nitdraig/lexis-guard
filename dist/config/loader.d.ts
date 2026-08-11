import { type Lexisrc, type RawLexisrc } from './lexisrc-schema.js';
/**
 * Load `.lexisrc.json` (or `.lexisrc.yaml`, etc.) via cosmiconfig.
 * Validates with Zod and interpolates env vars.
 */
export declare function loadConfig(configPath?: string): Lexisrc;
/**
 * Load the raw `.lexisrc.json` content WITHOUT env interpolation.
 * Needed by the TUI to edit and re-save config without leaking secrets.
 */
export declare function loadRawConfig(configPath?: string): RawLexisrc;
//# sourceMappingURL=loader.d.ts.map