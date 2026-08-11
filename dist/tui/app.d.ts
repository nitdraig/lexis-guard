import React from 'react';
import type { RawLexisrc } from '../config/lexisrc-schema.js';
interface AppProps {
    initialRawConfig?: RawLexisrc | null;
    initialConfigPath?: string | null;
    initialTarget?: string | null;
    onQuit?: () => void;
}
export declare function App({ initialRawConfig, initialConfigPath, initialTarget, onQuit }: AppProps): React.ReactElement;
export {};
//# sourceMappingURL=app.d.ts.map