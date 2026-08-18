# AGENTS.md

Guidelines for AI agents and humans working in this repository: LexisGuard.

## Project

LexisGuard is a TUI workbench + one-shot CLI for automated API auditing: security
(OWASP-style), performance and scalability checks. Findings are deduplicated,
sanitized, stored as replayable sessions, summarized and answered by an AI agent
(`lexis-guard`), and exportable as JSON / Markdown / SARIF.

- Node.js 20+, TypeScript strict, ESM (`module: NodeNext`, imports use `.js` suffixes).
- Not a web app: terminal UI with [Ink](https://github.com/vadimdemedes/ink) + `@inkjs/ui`.
- Tests: Vitest. No network calls in unit tests.

## Commands

```bash
npm install
npm run build         # tsc -> dist/
npm test              # vitest run (all suites)
npx tsc --noEmit      # type check (lint = tsc, no eslint)
```

Always run `npm run build`, `npx tsc --noEmit` and `npm test` before finishing.

## Layout

```
src/
  cli.ts              # entry point: flags, one-shot pipeline, workbench bootstrap
  config/             # .lexisrc.json schemas, parsers, loader, env interpolation, secrets
  core/               # scope-guard, auth-guard, throttle, http-engine, sanitizer,
                      # deduplicator, audit-log (+ sessions), trending
  modules/            # AuditModule impls: security, performance, scalability, cross-auth
  ai/                 # providers (cloud + local + stub), router, model catalog, factory
  reporter/           # json / markdown / sarif reporters, suppressions
  openapi/            # endpoint discovery from OpenAPI specs
  tui/                # workbench: app.tsx router, orchestrator, audit-screen, views/, components/
  types/              # shared domain types (Finding, severity, ...)
tests/                # vitest suites, mirroring src/ (core, config, modules, ai, reporter, openapi)
```

## Source of truth

- **Raw config** (`loadRawConfig` / `src/config/loader.ts`): reads `.lexisrc.json`, validates
  with `rawLexisrcSchema`, **no env interpolation** and **no defaults applied**. This is what
  the TUI edits and what the Config screen saves.
- **Resolved config** (`parseLexisrc` / `parseLexisrcStrict`): interpolates `${ENV_VAR}` in
  auth tokens, applies defaults (`ai.model` fallback, etc.), validates with `lexisrcSchema`.
  Audit / one-shot CLI use the resolved config.
- `defaultRawLexisrc()` (`src/config/default.ts`): starting point for a fresh TUI session.

## Domain invariants (do not break)

1. **Scope Guard**: never send a request to a host outside `scope.allowed_targets`.
   The one-shot CLI rejects targets outside the list; no override flag exists by design.
2. **Safety limits**: per-request timeout (15s, AbortController) and a 3-state throttle
   (normal / throttle / abort). All new checks go through `HttpEngine`, never raw `fetch`.
3. **Sanitization**: any finding that reaches a report, the AI layer or a persisted session
   must be deduplicated AND sanitized (`Sanitizer` redacts target hostnames to
   `TARGET_REDACTED_NN`). Never send real hostnames to the AI.
4. **Secrets**: `ai.api_key` is stored encrypted (`encryptSecret`, AES-256-GCM, key material
   in `~/.lexisguard/.secret`). Never write a plaintext key to `.lexisrc.json` or a session.
5. **Auth**: resolved config requires >= 3 profiles (2 standard with `owns` + 1 admin).
6. **AI filter**: `lexis-guard` only answers questions about API security and API performance.
   The cloud provider system prompt enforces this; the offline stub has a keyword gate.
7. **AI routing** (`createAIRouter` in `src/ai/factory.ts`): local providers (ollama /
   lmstudio) always use the real local inference and need no API key; cloud providers use
   the SDK only when a key is set, else the deterministic `LocalProvider` stub.
8. **Sessions**: every completed workbench audit persists via `AuditLog.saveSession`
   (`~/.lexisguard/sessions/`); history loads them back. The log file is for history/trending
   only and does not store findings.
9. **Local endpoints**: Ollama and LM Studio are OpenAI-compatible `/v1` servers
   (`http://localhost:11434/v1`, `http://localhost:1234/v1`) — configured through
   `createOpenAI` with a baseURL. Do not reintroduce `ollama-ai-provider` (it targets the old
   AI SDK v4 model interface and is type-incompatible with `ai` v7).

## AI SDK (v7) notes

- Use `generateText({ model, output: Output.object({ schema }), system, prompt })`.
- `generateObject` is **deprecated** — do not use it.
- Model instance type: `NonNullable<Parameters<typeof generateText>[0]['model']>`.
- System prompts live in `src/ai/cloud-provider.ts` (triage / synthesize / consult).
- Offline fallback providers: `LocalProvider` (id `local`) — deterministic, keep it that way.

## TUI conventions

- Navigation: Esc backtracks one step (`useInput`). Screens with a `TextInput` must NOT also
  render a `Select` — focus ambiguity breaks Enter (this bug shipped twice; do not repeat it).
- Views live in `src/tui/views/`, shared pieces in `src/tui/components/`. State and routing
  live in `src/tui/app.tsx` (`TuiSession`, `ViewId`).
- Live audit progress: modules stream findings through `onFinding`; `AuditScreen` ticks
  duration/request count while running.
- All UI copy is English.

## Code style

- Code and comments in English; docs/ may be written in Spanish (team language). No Spanish in `src/`.
- TS strict; no `any`, no `unknown` where a type exists, no lying assertions.
- Targeted edits; never rewrite a file wholesale without a reason.
- Mark intentional simplifications with a `// lexis:` comment explaining the ceiling /
  upgrade path (existing convention).
- New checks/behavior ship with tests. Keep suites small and network-free.

## Windows realities

- `src/cli.ts` carries a `#!/usr/bin/env node` shebang (tsc preserves it) — keep it first line.
- Global command shims (`lexisg-cli.cmd`) are hand-maintained; `npm link` alone produced
  broken shims that opened Notepad (missing `node` invocation). Re-verify with
  `lexisg-cli.cmd --help` after any change to the bin wiring.
- ISO timestamps contain `:` which is invalid in Windows filenames — session files replace
  `:` with `-` (see `AuditLog.sessionFileName`).

## License

PolyForm Noncommercial 1.0.0 (SPDX `PolyForm-Noncommercial-1.0.0`). Non-commercial use,
copying and distribution only, with attribution to LexisGuard. By contributing you agree to
these terms. See LICENSE and CONTRIBUTING.
