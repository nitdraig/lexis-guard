import { cosmiconfigSync } from 'cosmiconfig';
import { parseLexisrcStrict } from './lexisrc-parser.js';
import { rawLexisrcSchema, type Lexisrc, type RawLexisrc } from './lexisrc-schema.js';

const moduleName = 'lexis';

/**
 * Load `.lexisrc.json` (or `.lexisrc.yaml`, etc.) via cosmiconfig.
 * Validates with Zod and interpolates env vars.
 */
export function loadConfig(configPath?: string): Lexisrc {
  const raw = loadRawConfig(configPath);
  return parseLexisrcStrict(raw);
}

/**
 * Load the raw `.lexisrc.json` content WITHOUT env interpolation.
 * Needed by the TUI to edit and re-save config without leaking secrets.
 */
export function loadRawConfig(configPath?: string): RawLexisrc {
  const explorer = cosmiconfigSync(moduleName, {
    searchPlaces: [
      `.${moduleName}rc.json`,
      `.${moduleName}rc.yaml`,
      `.${moduleName}rc.yml`,
      // lexis: .js/.cjs config files are excluded to prevent RCE via cosmiconfig require()
      'package.json'
    ]
  });

  const result = configPath
    ? explorer.load(configPath)
    : explorer.search();

  if (!result || result.isEmpty) {
    throw new Error(`No ${moduleName}rc configuration found. Create a .lexisrc.json file.`);
  }

  const parsed = rawLexisrcSchema.safeParse(result.config);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    );
    throw new Error(`Invalid ${moduleName}rc configuration:\n${errors.join('\n')}`);
  }

  return parsed.data;
}
