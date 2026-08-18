/**
 * Gate for audit modules that send mutating or potentially destructive
 * payloads (injection probes, SSRF active probing). Such modules only run
 * after explicit confirmation in the TUI or via --allow-exploitation in the
 * CLI; otherwise they are skipped and reported as skipped.
 */
export class EscalationGate {
  private readonly confirmed = new Set<string>();
  private allowAll = false;

  constructor(allowExploitation = false) {
    this.allowAll = allowExploitation;
  }

  /** Globally allow every gated module (CLI --allow-exploitation). */
  allowExploitation(): void {
    this.allowAll = true;
  }

  /** Confirm a single gated module (TUI prompt). */
  confirm(moduleId: string): void {
    this.confirmed.add(moduleId);
  }

  /** True when a module may run. */
  isAllowed(moduleId: string): boolean {
    return this.allowAll || this.confirmed.has(moduleId);
  }

  /** Modules the gate would skip right now (gated ids minus confirmed). */
  blockedModules(moduleIds: string[]): string[] {
    if (this.allowAll) return [];
    return moduleIds.filter((id) => !this.confirmed.has(id));
  }
}
