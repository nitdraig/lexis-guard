import React from 'react';
import type { RawLexisrc } from '../../config/lexisrc-schema.js';
import type { TuiSession } from '../session.js';
interface ConfigViewProps {
    session: TuiSession;
    onUpdateRaw: (raw: RawLexisrc) => void;
    onUpdatePath: (path: string | null) => void;
    onBack: () => void;
}
export declare function isValidTarget(input: string): boolean;
export declare function targetHostname(input: string): string;
export declare function ConfigView({ session, onUpdateRaw, onUpdatePath, onBack }: ConfigViewProps): React.ReactElement;
export {};
//# sourceMappingURL=config.d.ts.map