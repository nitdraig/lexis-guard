# Contributing to LexisGuard

Thanks for considering a contribution. LexisGuard is a small, opinionated project: audits must stay **safe, deterministic and quiet** unless the user asks for more. Please read this before opening an issue or a pull request.

## Scope of the project

LexisGuard audits APIs for security, performance and scalability issues. Contributions that add checks, modules, reporters, AI provider integrations or workbench features are welcome. Contributions that drift the project into generic automation tooling are not.

## Ground rules

- **TypeScript strict, always.** No `any`, no `unknown` where a precise type exists; follow the existing naming conventions (English identifiers, PascalCase components, camelCase functions).
- **Targeted edits.** Never rewrite a whole file unless the change genuinely requires it. Shortest diff wins.
- **Safe by design.** New checks must respect the Scope Guard, the throttling engine and the request timeout. Nothing may ever scan a host outside `scope.allowed_targets`.
- **Sanitized output.** Anything that could reach a report or the AI layer must pass through the Sanitizer (no real hostnames in outputs).
- **Tests.** Every behavior change ships with tests. `npm test` must pass before opening a PR.
- **English.** Code, comments, docs and the interactive UI are in English.

## Development setup

```bash
npm install
npm run build          # tsc -> dist/
npm test               # vitest suite
npx tsc --noEmit       # type check
```

## Adding an audit check

Follow the existing module pattern:

1. Add the check to the relevant module in `src/modules/` (Security, Performance or Scalability), emitting `Finding` objects through the module's `track()` helper so they stream live to the TUI.
2. Register any new constant (rule id, default value) with a descriptive name — no magic strings.
3. Add tests covering a vulnerable response and a clean response.
4. Update the module description map in `src/tui/components/module-progress.tsx` if the check set changes.

## Pull request process

1. Keep PRs small and focused — one feature or fix per PR.
2. Run `npm run build`, `npx tsc --noEmit` and `npm test` locally.
3. Open the PR with a `[lexisguard]` prefix and describe what, why and how you verified it.
4. A reviewer may ask for a manual smoke test; the interactive workbench is part of the product, not just the CLI.

## Security

- If you find a vulnerability in LexisGuard itself, **do not open a public issue**. Contact the maintainers privately using the contact listed in the repository.
- Never commit secrets, API keys or real credentials — see `.env.example` and the encrypted key storage flow in `src/config/secret.ts`.
- LexisGuard is an auditing tool for APIs you are authorized to test. Do not use it against systems you do not own or lack written permission to audit.

## License and attribution

By contributing you agree that your contribution is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE): contributions may be used, copied and distributed for non-commercial purposes, and everyone who receives a copy must also receive the license terms and the `Required Notice` line crediting LexisGuard. Commercial use of contributed code requires prior written permission from the licensor.