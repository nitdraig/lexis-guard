import { render } from 'ink';
import { App } from './app.js';
import type { RawLexisrc } from '../config/lexisrc-schema.js';

/**
 * Start the multi-view TUI workbench. Returns a promise that resolves
 * when the user quits (Quit menu item or Ctrl+C).
 */
export async function startTUI(options?: {
  target?: string | null;
  rawConfig?: RawLexisrc | null;
  configPath?: string | null;
  onQuit?: () => void;
}): Promise<void> {
  const app = render(
    <App
      initialRawConfig={options?.rawConfig ?? null}
      initialConfigPath={options?.configPath ?? null}
      initialTarget={options?.target ?? null}
      onQuit={options?.onQuit}
    />
  );
  await app.waitUntilExit();
}