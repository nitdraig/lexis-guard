import type { Lexisrc } from './config/lexisrc-schema.js';
export interface WizardAnswers {
    target: string;
    config: Lexisrc;
    mode: 'safe' | 'aggressive';
    format: 'json' | 'md' | 'sarif';
    output?: string;
}
/**
 * Interactive wizard when no CLI flags are provided.
 * Returns answers or null if user cancels.
 */
export declare function runWizard(): Promise<WizardAnswers | null>;
//# sourceMappingURL=wizard.d.ts.map