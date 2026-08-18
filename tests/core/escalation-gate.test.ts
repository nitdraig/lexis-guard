import { describe, it, expect } from 'vitest';
import { EscalationGate } from '../../src/core/escalation-gate.js';

describe('EscalationGate', () => {
  it('blocks gated modules by default', () => {
    const gate = new EscalationGate();
    expect(gate.isAllowed('injection')).toBe(false);
    expect(gate.blockedModules(['injection', 'ssrf'])).toEqual(['injection', 'ssrf']);
  });

  it('allows a confirmed module only', () => {
    const gate = new EscalationGate();
    gate.confirm('injection');
    expect(gate.isAllowed('injection')).toBe(true);
    expect(gate.isAllowed('ssrf')).toBe(false);
  });

  it('allows everything when exploitation is enabled', () => {
    const gate = new EscalationGate(true);
    expect(gate.isAllowed('injection')).toBe(true);
    expect(gate.blockedModules(['injection', 'ssrf'])).toEqual([]);
  });
});
