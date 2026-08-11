# LexisGuard — Product Blueprint & Improvement Plan

| | |
| --- | --- |
| **Status** | Living document |
| **Product** | LexisGuard CLI (`lexisguard` / `lexisg-cli`) — automated API audit orchestrator |
| **Baseline commit** | `4fc6470` |
| **Last updated** | 2026-08-11 |
| **Audience** | Maintainers and executor agents |

This document is the **base product blueprint** updated with improvements already landed in the codebase, plus a prioritized roadmap for what remains. It supersedes ad-hoc audit notes; implement against the gaps below, not against older session summaries.

---

## 1. Product blueprint (how it should work)

LexisGuard is a **deterministic-first DAST orchestrator** for HTTP APIs, with optional AI annotation. Humans and CI share one pipeline; the TUI is a workbench over that pipeline, not a second product.

### 1.1 Ideal end-to-end flow

```text
┌─────────────────────────────────────────────────────────────────┐
│  Input                                                          │
│  · target URL                                                   │
│  · .lexisrc (scope, auth profiles, mode, limits, AI)            │
│  · optional OpenAPI/Swagger (--spec)                            │
│  · optional .lexisignore (suppressions with expiry)             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preflight                                                      │
│  · canonicalize target to absolute origin (https://…)           │
│  · Scope Guard (exact hostname allowlist)                       │
│  · Auth Guard (multi-profile readiness for BOLA/BFLA)           │
│  · load & validate .lexisignore                                 │
│  · resolve audit profile (quick | deep) × mode (safe | aggressive)│
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Discovery                                                      │
│  · parse OpenAPI → Endpoint[] (method, path, operationId)       │
│  · map auth `owns` resources → real paths (not heuristics only) │
│  · refuse remote spec hosts outside allowlist                   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Execution (shared HttpEngine)                                  │
│  · modules: security → performance → scalability                │
│  · concurrency + reversible throttle + abort on degradation     │
│  · stream findings to UI / collectors                           │
│  · honor max_requests_per_test and mode gates                   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Post-process (ONE pipeline for CLI and TUI)                    │
│  · deduplicate (hash → count, worst_case)                       │
│  · sanitize (hosts + secrets/tokens/cookies)                    │
│  · apply .lexisignore suppressions                              │
│  · AI triage (cheap) + synthesis (once) via createAIRouter      │
│  · report JSON | Markdown | SARIF                               │
│  · audit log + optional session save / trending                 │
│  · exit code from CVSS threshold / worst_case (CI)              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Non-negotiable product rules

| Rule | Rationale |
| --- | --- |
| Scope allowlist is mandatory; no silent override | Prevent accidental production / out-of-scope scans |
| Scores are deterministic; AI only annotates | CI reproducibility; AI never invents severity |
| Safe vs aggressive must change behavior | Production-safe default; deep stress only when opted in |
| CLI one-shot and TUI share the same post-process | Same findings, reports, and exit semantics |
| Secrets never leave the process unredacted | Evidence in reports and AI prompts must be scrubbed |
| Modules stay pluggable via `AuditModule` | New checks without rewriting the orchestrator |

### 1.3 Surface areas (blueprint components)

| Area | Role | Primary paths |
| --- | --- | --- |
| Config | `.lexisrc` / cosmiconfig + Zod + env/secret interpolation | `src/config/*` |
| Guards | Scope + auth readiness | `src/core/scope-guard.ts`, `src/core/auth-guard.ts` |
| Engine | undici pool, latency, throttle | `src/core/http-engine.ts`, `src/core/throttle.ts` |
| Modules | Security / performance / scalability | `src/modules/*` |
| OpenAPI | Endpoint discovery | `src/openapi/parser.ts` |
| Profiles | Quick / deep check matrices | `src/config/profiles.ts` |
| AI | Provider factory + two-level router + consult | `src/ai/*` |
| Reporters | JSON / MD / SARIF + suppressions | `src/reporter/*` |
| TUI | Multi-view workbench | `src/tui/*` |
| CLI | One-shot CI path + workbench entry | `src/cli.ts` |

### 1.4 Intended UX

- **Workbench (default without `--target`)**: Ink TUI — Home → Audit / Configuration / History / Consult AI / Export.
- **One-shot (`--target`)**: Non-interactive audit for CI; prints or writes report; non-zero exit when findings exceed `--threshold`.
- **Config**: Editable raw `.lexisrc` in TUI (placeholders preserved); resolved config required to run audits.

---

## 2. Improvements already landed (adapted baseline)

Do **not** re-plan work that is already in tree. Treat these as done relative to the early scaffold.

| Theme | What landed | Evidence |
| --- | --- | --- |
| Multi-view workbench | Home, Audit, Config, History, AI, Export + session model | `src/tui/app.tsx`, `src/tui/views/*`, `src/tui/session.ts` |
| TUI as default UX | No `--target` opens workbench; `--tui` explicit; non-TTY guard | `src/cli.ts` |
| Audit screen stability | `HttpEngine` in `useRef`, cancel/cleanup, health check, live request count | `src/tui/audit-screen.tsx` |
| AI factory | `createAIRouter` — local (Ollama/LM Studio) vs cloud SDKs + offline stub fallback | `src/ai/factory.ts`, `src/ai/cloud-provider.ts`, `src/ai/models.ts` |
| AI consult | Interactive Q&A over last findings | `AIProvider.consult`, `src/tui/views/ai.tsx` |
| Secret handling (config) | Encrypted API keys + `dotenv` | `src/ai/factory.ts` (`decryptSecret`), `dotenv/config` in CLI |
| Session history | Persist / restore audit sessions from audit log | `AuditLog.saveSession`, History view |
| Streaming findings | Orchestrator `onFinding` + panel updates | `src/tui/orchestrator.ts`, audit screen |
| Packaging | Dual bin names, richer AI SDK deps | `package.json` |

**Implication:** The blueprint’s *workbench* and *AI routing* chapters are largely implemented. Remaining leverage is **discovery, shared pipeline completeness, mode/profile gates, throttle fidelity, and secret redaction in evidence**.

---

## 3. Current gaps (what still blocks the blueprint)

Ordered by leverage (impact ÷ effort). Confirmed against the tree at the baseline commit.

| ID | Gap | Category | Impact | Effort | Evidence |
| --- | --- | --- | --- | --- | --- |
| G-01 | `--spec` declared but never consumed; OpenAPI parser unused by audit path | correctness / product | High | M | `src/cli.ts` (`-s, --spec`); `src/openapi/parser.ts` |
| G-02 | No shared post-process module; CLI does dedupe→sanitize→AI→report; TUI stores findings without triage/synthesis/reporters in the same place | architecture | High | M | `src/cli.ts` vs `src/tui/app.tsx` `storeFindings` |
| G-03 | `profiles.ts` (quick/deep) and `config.mode` do not gate module checks; soak/BOLA run regardless of “safe” | correctness / safety | High | M | `src/config/profiles.ts`; modules ignore mode |
| G-04 | Throttle reduces concurrency in controller API but engine keeps fixed `pLimit` | correctness / safety | Med | S | `ThrottleController.getConcurrencyLimit`; `HttpEngine` limiter |
| G-05 | Sanitizer redacts allowlisted hosts only — cookie/JWT snippets can land in evidence | security | High | S | `src/modules/security-module.ts` JWT cookie evidence; `src/core/sanitizer.ts` |
| G-06 | `.lexisignore` parsers/reporters exist; CLI/TUI never load or pass suppressions | product | Med | S | `src/config/lexisignore-parser.ts`; reporters accept optional arg unused by callers |
| G-07 | `auth-guard` not wired into preflight before BOLA/BFLA | architecture | Med | S | `src/core/auth-guard.ts` unused by CLI/TUI entry |
| G-08 | Cross-auth paths are heuristics (`order:1001` → `/orders/1001`; fixed `/admin/*`) | product depth | High | M | `src/modules/cross-auth-tester.ts` |
| G-09 | Security surface is mostly header/file probes + cross-auth; not OWASP API Top 10 over discovered ops | product depth | High | L | `src/modules/security-module.ts` |
| G-10 | `trending.ts` unused; no delta vs previous sessions in UI/CLI | direction | Low | S | `src/core/trending.ts` |
| G-11 | Target URL normalization: scope accepts bare hostnames; `Pool` needs absolute URL | correctness | Med | S | `src/core/scope-guard.ts` vs `HttpEngine` constructor |
| G-12 | No root README / operator docs (only this plan so far) | DX | Med | S | missing `README.md` |

---

## 4. Roadmap — phased improvements

Execute phases in order. Each phase should leave `npm run lint` and `npm test` green.

### Phase A — Shared audit pipeline (foundation)

**Goal:** One function owns post-module processing for CLI and TUI.

1. Extract e.g. `src/core/audit-pipeline.ts`:
   - Input: raw `Finding[]`, `Lexisrc`, meta builders, optional `Lexisignore`, AI config.
   - Steps: `deduplicate` → secret+host `sanitize` → apply ignore → `createAIRouter` triage/synthesize → return `{ findings, synthesis, meta }`.
2. CLI one-shot and TUI `storeFindings` / export path call the same helper.
3. Canonicalize target to absolute origin once after scope validation; pass that URL to `HttpEngine`.
4. Wire `resolveAuthProfiles` (auth-guard) in preflight; fail fast with clear errors when BOLA/BFLA prerequisites missing (or skip those checks explicitly when profile = quick).

**Done when:** Changing sanitization or AI triage requires editing one module; both surfaces get identical deduped shapes.

### Phase B — OpenAPI discovery & auth mapping

**Goal:** `--spec` drives what gets tested.

1. CLI: read `options.spec`; TUI Config/Audit: optional spec path field.
2. Call `discoverEndpoints`; if spec is a URL, validate host against allowlist before fetch.
3. Pass `Endpoint[]` into security / cross-auth (extend `AuditModule.run` or a shared `AuditContext`).
4. Replace BFLA hard-coded admin paths with operations tagged admin / matching config; map `owns` entries to OpenAPI path templates where possible.
5. Keep heuristic fallback only when no spec is provided (document the limitation).

**Done when:** An audit with a real OpenAPI file exercises those paths; without spec, behavior is documented and tests cover both modes.

### Phase C — Profiles, modes, and throttle fidelity

**Goal:** Config means what users think it means.

1. Drive module internals (or a check registry) from `resolveProfile('quick' | 'deep')`.
2. Gate aggressive work: soak / high burst only in `aggressive` (or deep+aggressive); safe mode = headers, passive probes, limited latency checks.
3. Honor `getConcurrencyLimit()` inside `HttpEngine` (dynamic limiter or admission control) in addition to abort.
4. Enforce `max_requests_per_test` as a hard ceiling in the engine.

**Done when:** Unit tests prove safe mode never starts soak; throttle state reduces in-flight concurrency.

### Phase D — Secret redaction & suppressions

**Goal:** Safe reports and AI prompts.

1. Extend `Sanitizer` (or a sibling) to redact Bearer tokens, JWT-shaped strings, `Set-Cookie` values, and common API key header patterns in `evidence` / descriptions before AI and reporters.
2. Load `.lexisignore` next to config (cosmiconfig or fixed filename); pass into reporters and filter findings pre-report.
3. Ensure TUI Export and CLI output both receive suppressions.

**Done when:** Cookie/JWT fixtures never appear verbatim in generated JSON/MD/SARIF; ignored hashes are absent from active findings (and listed as suppressions where the format supports it).

### Phase E — Depth of security checks

**Goal:** Credible OWASP API coverage on discovered endpoints.

Prioritize (after B/C):

- Broken authentication patterns (unauthenticated access to protected ops from spec).
- Mass assignment / unexpected fields on write ops (aggressive only).
- Rate-limit presence (already partially sketched in profiles).
- Excessive data exposure heuristics on JSON responses (size / sensitive key names) with redaction.
- TLS / redirect basics on HTTPS targets.

Keep checks deterministic and testable with MSW; AI remains annotation-only.

### Phase F — DX & observability

1. Root `README.md`: install, `.lexisrc` example, workbench vs CI, exit codes, AI providers.
2. Surface trending (delta vs last session for same target) in History or post-audit summary.
3. Align package `description` / bin naming docs with actual binaries (`lexisguard`, `lexisg-cli`).

---

## 5. Suggested execution order (for agents)

| Step | Plan focus | Depends on | Effort |
| --- | --- | --- | --- |
| 1 | Phase A — shared pipeline + URL canonicalize + auth-guard preflight | — | M |
| 2 | Phase D — secret sanitizer + `.lexisignore` load (can parallelize with B after A starts) | A (sanitize hook) | S–M |
| 3 | Phase B — wire `--spec` + feed endpoints | A | M |
| 4 | Phase C — profiles / mode / throttle | A | M |
| 5 | Phase E — deeper security checks | B, C | L |
| 6 | Phase F — README + trending UX | A | S |

Verification baseline for every step:

```bash
npm run lint    # tsc --noEmit → exit 0
npm test        # vitest → all pass
```

---

## 6. Explicit non-goals (for now)

- Replacing undici or Ink.
- Auto-remediation or applying fixes to the target API.
- Letting AI overwrite CVSS / severity.
- Wildcard scope (`*.example.com`) — blueprint remains exact hostname match unless a future RFC changes it.
- Full browser/DOM DAST — product is API-oriented.

---

## 7. Success criteria (blueprint fulfilled)

The blueprint is considered **implemented for v1** when all of the following hold:

- [ ] `--spec openapi.yaml` changes which paths are probed (proven by test).
- [ ] `mode: safe` cannot run soak/burst stress (proven by test).
- [ ] Quick vs deep profiles select different check sets (proven by test).
- [ ] CLI and TUI produce the same deduped finding set for the same target/config (shared pipeline).
- [ ] Evidence in reports has no raw session cookies / JWTs from fixture responses.
- [ ] `.lexisignore` entries suppress matching hashes in CLI output.
- [ ] Throttle state reduces concurrency before abort.
- [ ] README documents workbench, CI one-shot, and exit codes.
- [ ] `npm run lint` and `npm test` remain green.

---

## 8. Maintenance

- Update **§2** when a gap is closed; move the row out of **§3** or mark it Done with PR/commit ref.
- Prefer small PRs that map to one phase step.
- Comments, code, and this documentation stay in **English**; user-facing TUI copy may follow product language choices already in views.
|
