import { jsx as _jsx } from "react/jsx-runtime";
import { render } from 'ink';
import { App } from './app.js';
/**
 * Start the multi-view TUI workbench. Returns a promise that resolves
 * when the user quits (Quit menu item or Ctrl+C).
 */
export async function startTUI(options) {
    const app = render(_jsx(App, { initialRawConfig: options?.rawConfig ?? null, initialConfigPath: options?.configPath ?? null, initialTarget: options?.target ?? null, onQuit: options?.onQuit }));
    await app.waitUntilExit();
}
//# sourceMappingURL=index.js.map