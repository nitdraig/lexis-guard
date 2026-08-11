import React from 'react';
import { type SavedSession } from '../../core/audit-log.js';
interface HistoryViewProps {
    onBack: () => void;
    /** Restores a saved session into the workbench (findings + meta ready for AI / Export). */
    onLoadSession: (session: SavedSession) => void;
}
export declare function HistoryView({ onBack, onLoadSession }: HistoryViewProps): React.ReactElement;
export {};
//# sourceMappingURL=history.d.ts.map