import React from 'react';
import { deduplicate } from '../../core/deduplicator.js';
import type { TuiSession } from '../session.js';
interface AuditViewProps {
    session: TuiSession;
    onStoreFindings: (target: string, findings: ReturnType<typeof deduplicate>, durationMs: number) => void;
    onAddTarget: (hostname: string) => void;
    onBack: () => void;
}
export declare function AuditView({ session, onStoreFindings, onAddTarget, onBack }: AuditViewProps): React.ReactElement;
export {};
//# sourceMappingURL=audit.d.ts.map