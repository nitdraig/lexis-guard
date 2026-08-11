import type { RawLexisrc } from '../config/lexisrc-schema.js';
/**
 * Start the multi-view TUI workbench. Returns a promise that resolves
 * when the user quits (Quit menu item or Ctrl+C).
 */
export declare function startTUI(options?: {
    target?: string | null;
    rawConfig?: RawLexisrc | null;
    configPath?: string | null;
    onQuit?: () => void;
}): Promise<void>;
//# sourceMappingURL=index.d.ts.map