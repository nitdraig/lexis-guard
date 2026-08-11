import { cosmiconfigSync } from 'cosmiconfig';
import { parseLexisrcStrict } from './lexisrc-parser.js';
import type { Lexisrc } from './lexisrc-schema.js';

const moduleName = 'lexis';

/**
 * Load `.lexisrc.json` (or `.lexisrc.yaml`, etc.) via cosmiconfig.
 * Validates with Zod and interpolates env vars.
 */
export function loadConfig(configPath?: string): Lexisrc {
  const explorer = cosmiconfigSync(moduleName, {
    searchPlaces: [
      `.${moduleName}rc.json`,
      `.${moduleName}rc.yaml`,
      `.${moduleName}rc.yml`,
      `.${moduleName}rc.js`,
      `.${moduleName}rc.cjs`,
      `${moduleName}.config.js`,
      `${moduleName}.config.cjs`,
      'package.json'
    ]
  });

  const result = configPath
    ? explorer.load(configPath)
    : explorer.search();

  if (!result || result.isEmpty) {
    throw new Error(`No ${moduleName}rc configuration found. Create a .lexisrc.json file.`);
  }

  return parseLexisrcStrict(result.config);
}
