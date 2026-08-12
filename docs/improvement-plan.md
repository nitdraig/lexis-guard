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
| Shared audit pipeline | `runAuditPipeline` dedupes → sanitizes → applies `.lexisignore` → triages/synthesizes with AI; used by CLI and TUI | `src/core/audit-pipeline.ts`, `src/cli.ts`, `src/tui/app.tsx` |
| OpenAPI discovery | `--spec` parsed; endpoints feed security/cross-auth checks; remote spec hosts validated against scope | `src/cli.ts`, `src/openapi/parser.ts`, `src/modules/security-module.ts`, `src/modules/cross-auth-tester.ts` |
| Profiles & mode gates | `profile: quick | deep` selects check matrix; soak/burst and aggressive cross-auth gated by `mode: aggressive` | `src/config/profiles.ts`, `src/modules/scalability-module.ts`, `src/modules/cross-auth-tester.ts` |
| Throttle fidelity | `HttpEngine` recreates `pLimit` when `ThrottleController` changes the concurrency limit | `src/core/http-engine.ts` |
| Secret redaction | Sanitizer strips JWT-shaped strings, Bearer tokens, `Set-Cookie` values, and API-key headers from evidence | `src/core/sanitizer.ts` |
| Suppressions | `.lexisignore` loaded and passed to reporters; CLI filters findings pre-report | `src/config/lexisignore-loader.ts`, `src/cli.ts` |
| Auth guard wiring | `resolveAuthProfiles` called in CLI preflight; missing profiles surface as a warning | `src/core/auth-guard.ts`, `src/cli.ts` |
| Cross-auth over discovered ops | BOLA/BFLA probes use spec-declared paths; heuristic fallback kept for spec-less runs | `src/modules/cross-auth-tester.ts` |
| Deeper security checks | Broken auth, mass assignment on write ops, excessive data exposure heuristics, TLS/redirect basics | `src/modules/security-module.ts` |
| Trending | `computeTrend` compares current finding count vs previous run for the same target | `src/core/trending.ts`, `src/cli.ts` |
| Target canonicalization | `canonicalizeTarget` normalizes bare hostnames to `https://` origin once after scope validation | `src/core/scope-guard.ts`, `src/cli.ts` |

**Implication:** The blueprint’s *workbench*, *AI routing*, *shared pipeline*, *OpenAPI discovery*, *mode/profile gates*, *throttle*, *secret redaction*, and *trending* chapters are largely implemented. Remaining leverage is **documentation completeness, test coverage for the new modules, and npm/landing packaging**.

---

## 3. Current gaps (what still blocks the blueprint)

Ordered by leverage (impact ÷ effort). Confirmed against the tree at the baseline commit.

| ID | Gap | Category | Impact | Effort | Evidence |
| --- | --- | --- | --- | --- | --- |
| G-12 | README exists but does not document exit codes / CVSS threshold behavior | DX | Low | S | `README.md` mentions `--threshold` but not exit semantics; `src/cli.ts` returns `1` on critical/high findings |

---

## 4. Roadmap — phased improvements

Status after commit `2212495`:

| Phase | Status | Notes |
| --- | --- | --- |
| A — Shared audit pipeline | Done | `runAuditPipeline` shared by CLI and TUI |
| B — OpenAPI discovery | Done | `--spec` consumed; endpoints feed security/cross-auth |
| C — Profiles, modes, throttle | Done | `quick/deep` profile gates + dynamic `pLimit` |
| D — Secret redaction & suppressions | Done | JWT/Bearer/cookie/API-key redaction; `.lexisignore` loaded |
| E — Depth of security checks | Done | Broken auth, mass assignment, data exposure, TLS/redirect |
| F — DX & observability | Partial | `package.json` description aligned; trending in CLI; README still needs exit-code docs |
| G — Packaging & landing | Not started | Detailed in `docs/landing-npm-plan.md` |

### Phase F — DX & observability (remaining)

1. Document CLI exit codes in `README.md`:
   - `0` — no findings above `--threshold`.
   - `1` — at least one finding with `cvss >= threshold` or `worst_case === 'critical'`.
   - `2` — TTY required but not available.
   - Fatal errors also exit `1`.
2. Surface trending delta in the TUI History or post-audit summary (currently only printed in CLI one-shot).
3. Keep install/usage examples in sync between `README.md`, landing page, and npm registry page.

### Phase G — Packaging & landing

See `docs/landing-npm-plan.md`:

1. Add `files: ["dist"]` and `prepack` hook to `package.json`.
2. Add repository/homepage/bugs metadata; verify `npm pack --dry-run`.
3. Publish `lexisguard-cli` to npm and verify global install on Windows.
4. Build bilingual Astro landing under `site/` and deploy to GitHub Pages.

---

## 5. Suggested execution order (for agents)

| Step | Plan focus | Depends on | Effort |
| --- | --- | --- | --- |
| 1 | Phase F — README exit-code docs + TUI trending | — | S |
| 2 | Phase G — npm packaging, publish, verify (Windows shims) | — | S–M |
| 3 | Phase G — Astro landing EN/ES + GitHub Pages workflow | G step 2 | M |

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

- [x] `--spec openapi.yaml` changes which paths are probed (proven by test).
- [x] `mode: safe` cannot run soak/burst stress (proven by test).
- [x] Quick vs deep profiles select different check sets (proven by test).
- [x] CLI and TUI produce the same deduped finding set for the same target/config (shared pipeline).
- [x] Evidence in reports has no raw session cookies / JWTs from fixture responses.
- [x] `.lexisignore` entries suppress matching hashes in CLI output.
- [x] Throttle state reduces concurrency before abort.
- [ ] README documents workbench, CI one-shot, and exit codes.
- [x] `npm run lint` and `npm test` remain green.

---

## 8. Maintenance

- Update **§2** when a gap is closed; move the row out of **§3** or mark it Done with PR/commit ref.
- Prefer small PRs that map to one phase step.
- Comments, code, and this documentation stay in **English**; user-facing TUI copy may follow product language choices already in views.
|
