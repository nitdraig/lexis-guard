import { render } from 'ink';
import { AuditApp } from './app.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';

export function startTUI(target: string, config: Lexisrc): void {
  render(<AuditApp target={target} config={config} />);
}
