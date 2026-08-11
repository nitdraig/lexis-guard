import React from 'react';
import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
interface AuditScreenProps {
    target: string;
    config: Lexisrc;
    /** Called once with final findings + duration when the audit finishes. */
    onComplete?: (findings: Finding[], durationMs: number) => void;
    /** Called when the user presses Esc (return to menu). */
    onExit?: () => void;
}
export declare function AuditScreen({ target, config, onComplete, onExit }: AuditScreenProps): React.ReactElement;
export {};
//# sourceMappingURL=audit-screen.d.ts.map