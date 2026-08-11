import React from 'react';
import type { ViewId } from '../session.js';
interface HomeViewProps {
    targetCount: number;
    mode: string;
    provider: string;
    environment: string;
    hasFindings: boolean;
    onNavigate: (view: ViewId) => void;
    onQuit: () => void;
}
export declare function HomeView({ targetCount, mode, provider, environment, hasFindings, onNavigate, onQuit }: HomeViewProps): React.ReactElement;
export {};
//# sourceMappingURL=home.d.ts.map