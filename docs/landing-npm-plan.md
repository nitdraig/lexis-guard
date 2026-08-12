# LexisGuard — npm Publishing & Landing Page Plan

| | |
| --- | --- |
| **Status** | Plan — not started |
| **Product** | LexisGuard CLI (`lexisguard` / `lexisg-cli`) — automated API audit orchestrator |
| **Date** | 2026-08-11 |
| **Audience** | Maintainers and executor agents |

This document covers two initiatives: (1) publishing the CLI to npm so it can be
installed with `npm install -g lexisguard-cli`, and (2) a bilingual (EN/ES) landing
page built with Astro and deployed to GitHub Pages.

## 0. Project principles

LexisGuard follows the Lexis-Two engineering principles. Every step in this plan
(and any future change) must pass them.

| Principle | What it means |
| --- | --- |
| YAGNI | Question every feature and abstraction before it exists — the ladder below is the gate |
| KISS | Stdlib, platform APIs, and boring one-liners beat new dependencies |
| DRY | One `skills/` source, thin host adapters — slash commands route, they do not fork logic |
| SOLID | Clear module and service boundaries — no abstractions nobody asked for |

This project is proud to be part of **Excelso Open**, the open-source and
community-focused branch of Excelso, championing collaborative technology and
social impact projects. Learn more about our mission and other projects at
[excelso.xyz](https://excelso.xyz).

---

## 1. How to apply the principles to this plan

| Decision | Principle check |
| --- | --- |
| Astro for the landing only — no full framework swap | YAGNI |
| Native Astro i18n routing instead of a library | KISS |
| One shared `src/i18n/{en,es}.ts` source, thin page wrappers | DRY |
| `site/` has its own package.json; CLI package stays intact | SOLID boundary |
| `files: ["dist"]` + `prepack` instead of custom packaging scripts | KISS |

---

## 2. Publish to npm

### Current state

- Package name: `lexisguard-cli` (v0.1.0), ESM, `engines.node >= 20`.
- `bin` already declares `lexisg-cli` and `lexisguard` → `./dist/cli.js`.
- License: `PolyForm-Noncommercial-1.0.0` (valid on npm).
- Missing: `files` allowlist, pack verification, metadata for the registry page.

### Steps

1. **Packaging allowlist** — add to `package.json`:
   ```json
   "files": ["dist"]
   ```
   Without this, `npm publish` ships `node_modules`, `src/`, `tests/` and `docs/`.
   `README.md` and `LICENSE` are always included by npm regardless of `files`.
2. **Pre-publish gate** — add script so what ships always builds and passes tests:
   ```json
   "prepack": "npm run build && npm test"
   ```
   This runs on `npm pack` and `npm publish` automatically.
3. **Metadata** — add to `package.json`:
   ```json
   "repository": { "type": "git", "url": "git+https://github.com/<owner>/lexisguard.git" },
   "homepage": "https://<owner>.github.io/lexisguard/",
   "bugs": { "url": "https://github.com/<owner>/lexisguard/issues" },
   "author": "<owner>",
   "keywords": ["api-security", "audit", "cli", "dast", "owasp"]
   ```
   Note: description is currently in Spanish; translate to English to match the
   README (`Automated API security, performance and scalability auditing orchestrator`).
4. **Dry-run verification** (before publishing):
   ```bash
   npm pack --dry-run    # confirm only dist/, README.md, LICENSE, package.json
   npm pack              # produce the .tgz
   npm install -g ./lexisguard-cli-0.1.0.tgz
   lexisg-cli --help     # verify real terminal invocation (Windows shims are fragile)
   lexisguard --help
   ```
5. **Check name availability**: `npm view lexisguard-cli` — if taken, rename the
   package before step 6.
6. **Publish**:
   ```bash
   npm login
   npm publish --access public
   ```
7. **Versioning** — `npm version patch|minor|major` before each publish; keep
   `dist/` gitignored (it already is), the `prepack` hook rebuilds it.

### Acceptance criteria

- `npm install -g lexisguard-cli` works on a clean machine (Windows + *nix).
- `lexisg-cli --help` and `lexisguard --help` both respond.
- The published tarball contains no `src/`, `tests/` or `node_modules`.
- `npm run build` and `npm test` pass during `prepack`.

---

## 3. Landing page (Astro, EN/ES, GitHub Pages)

### Structure

Separate folder `site/` inside this repo with its own `package.json` so it never
interferes with the CLI's npm package.

```bash
cd site
npm create astro@latest . -- --template minimal
```

### Setup

1. **Static output** — Astro default (`output: 'static'`); no SSR, no backend.
2. **Base path** — `astro.config.mjs`:
   ```js
   export default defineConfig({
     site: 'https://<owner>.github.io',
     base: '/lexisguard/'   // repo = <owner>/lexisguard; omit if custom domain or <owner>.github.io
   });
   ```
   All internal links must respect `import.meta.env.BASE_URL` so assets resolve
   under `/lexisguard/`.
3. **i18n** — native Astro routing with two page trees:
   ```
   src/pages/en/index.astro
   src/pages/es/index.astro
   ```
   - Same layout, per-language copy (shared `Layout.astro`, content feed via
     `src/i18n/{en,es}.ts` with `siteTitle`, `tagline`, sections, etc.).
   - Language switcher in the header.
   - `src/pages/index.astro` → redirect to the preferred language from
     `Accept-Language`, default `en`.

### Page sections (both languages)

| Section | Content |
| --- | --- |
| Hero | Name + tagline + install command `npm install -g lexisguard-cli` |
| Features | Workbench TUI, audit modules (security/perf/scalability), safe-by-design, sessions, AI consultation, reports |
| Usage | `lexisg-cli --target api.example.com --format sarif -o report.sarif` |
| Config | Mini `.lexisrc.json` example |
| AI providers | Cloud (OpenAI, DeepSeek, Anthropic) + local (Ollama, LM Studio) |
| Footer | GitHub link + "Part of Excelso Open" link to excelso.xyz + PolyForm license note |

### GitHub Pages deployment

1. Workflow `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy landing to GitHub Pages
   on:
     push:
       branches: [main]
       paths: ['site/**', '.github/workflows/deploy.yml']
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency:
     group: pages
     cancel-in-progress: true
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: npm, cache-dependency-path: site/package-lock.json }
         - run: npm ci && npm run build
           working-directory: site
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with: { path: site/dist }
         - uses: actions/deploy-pages@v4
           id: deployment
   ```
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. Verify at `https://<owner>.github.io/lexisguard/` after first deploy.

### Acceptance criteria

- `/` redirects to `/en/` or `/es/` based on browser language.
- Every section is fully present in both languages (no mixed copy).
- Landing builds with `npm run build` and deploys to GitHub Pages from CI.
- All links/assets resolve under the `/lexisguard/` base path.

---

## 4. Execution order

1. npm packaging (fast; unblocks the landing's install command with the real name).
2. Publish + verify global install on Windows (check `lexisg-cli.cmd` shims are
   correctly generated — see AGENTS.md "Windows realities").
3. Scaffold `site/` with Astro, i18n pages, content.
4. Add the GitHub Pages workflow and deploy.

## 5. Notes / risks

- `lexisguard-cli` name may be taken on npm — verify before step 1 lands.
- Windows global installs: `npm link` produced broken shims before; always verify
  with `lexisg-cli.cmd --help` after installing the `.tgz`.
- Astro lives only in `site/package.json` — the root CLI package stays untouched.
- Landing copy should match the CLI's real behavior; keep the install/usage
  examples in sync with the README.
