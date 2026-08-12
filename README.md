# LexisGuard

Automated API security, performance and scalability auditing — an interactive workbench that stays open while you work.

LexisGuard audits a target API against OWASP-oriented security checks, latency/payload performance checks and rate-limit/soak scalability checks, deduplicates and sanitizes the findings, and turns them into an interactive session you can explore, consult with an AI agent, and export as JSON, Markdown or SARIF reports.

```
  __    __               _____                  _
 / / /\ \ \__ _  __ _  _|  ___| __ __ _ _ __ __| | __ _ _   _
 \ \/  \/ / _` |/ _` |/ _ \ |_ | '__/ _` | '__/ _` |/ _` | | | |
  \  /\  / (_| | (_| |  __/  _|| | | (_| | | | (_| | (_| | |_| |
   \/  \/ \__,_|\__, |\___|_|  |_|  \__,_|_|  \__,_|\__,_|\__, |
                |___/                                     |___/
```

## Features

- **Persistent TUI workbench** — launch `lexisg-cli` and configure, audit, consult and export without leaving the terminal.
- **Audit modules** — Security (headers, CORS, sensitive file exposure, stack leaks, JWT cookies, cross-auth BOLA/BFLA), Performance (latency, TTFB, payload compression, HTTP/2), Scalability (rate-limit burst, soak load, circuit breaker state).
- **Safe by design** — target scope guard, per-request 15s timeout, 3-state throttle (normal / throttle / abort) so audits never hammer a target.
- **Live results** — findings stream module-by-module with elapsed time and request count while the audit runs.
- **Sessions** — every completed audit is persisted; reopen the workbench later, browse history, load a session and keep working on its results.
- **AI consultation** — `lexis-guard`, an agent scoped strictly to API cybersecurity and API performance, summarizes the posture and answers questions about the findings.
- **Configurable AI** — cloud providers (OpenAI, DeepSeek, Anthropic) with a curated model catalog (economical / balanced / top tiers), or your local models via Ollama and LM Studio (auto-detected). API keys are stored AES-256-GCM encrypted.
- **Reports** — JSON, Markdown and SARIF with CWE/CVSS metadata, plus `.lexisignore` suppression with expiration enforcement.
- **Deterministic offline fallback** — without an API key, all AI outputs remain available through a local deterministic engine.

## Requirements

- Node.js 20 or newer
- npm

## Install and run

```bash
npm install
npm run build          # compiles TypeScript into dist/
npm link               # exposes the `lexisg-cli` / `lexisguard` commands globally
```

### Interactive workbench

```bash
lexisg-cli
```

The workbench requires a terminal (TTY). From the home screen you can:

| Option | What it does |
| --- | --- |
| Audit | pick a target (or enter a new URL) and run the full audit live |
| Configuration | add/remove targets, change mode, choose AI provider/model, set API key, save/import/export `.lexisrc.json` |
| History | browse saved sessions, inspect their findings, load them back into the session |
| Consult AI | get the synthesized posture and chat with `lexis-guard` about the findings |
| Export results | write the current findings as JSON, Markdown or SARIF |

### One-shot CLI

```bash
lexisg-cli --target api.example.com --format json --output report.json
lexisg-cli --target api.example.com --format sarif -o report.sarif
```

Run `lexisg-cli --help` for all options (`--config`, `--mode`, `--spec`, `--json`, `--tui`, `--threshold`).

## Configuration

LexisGuard reads `.lexisrc.json` from the current directory (or any other cosmiconfig `lexis` search place, or an explicit `--config` path).

```jsonc
{
  "scope": {
    "allowed_targets": ["api.example.com"],
    "environment": "production"
  },
  "mode": "safe",
  "auth": {
    "profiles": {
      "user_a": { "type": "bearer", "token": "${LEXIS_USER_A_TOKEN}", "role": "standard", "owns": ["order:1001"] },
      "user_b": { "type": "bearer", "token": "${LEXIS_USER_B_TOKEN}", "role": "standard", "owns": ["order:2001"] },
      "admin":  { "type": "bearer", "token": "${LEXIS_ADMIN_TOKEN}",  "role": "admin" }
    }
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-5.4-nano",
    "api_key": "",
    "redact_target": true,
    "local_fallback": true
  },
  "limits": { "max_concurrent_requests": 20, "max_requests_per_test": 500, "abort_on_latency_degradation_pct": 40 }
}
```

Notes:

- **Security scope guard** — audit targets must be inside `scope.allowed_targets`; anything else is rejected.
- **Multi-auth** — at least 3 profiles (2 standard + 1 admin) are required for cross-auth (BOLA/BFLA) testing.
- **Environment variables** — `${NAME}` tokens in auth values are interpolated from the process environment; a missing variable fails loudly.
- **API keys** — set through the workbench Configuration screen. Keys are encrypted with AES-256-GCM before being stored; the key material lives in `~/.lexisguard/.secret`.
  The `.lexisrc.json` itself never stores a plaintext key.
  > **Windows note:** Node.js does not enforce `0o600` file permissions on Windows.
  > On shared Windows machines, restrict NTFS permissions on the `~/.lexisguard` folder so
  > only the owner can read the `.secret` file.
- **`.lexisignore`** — list of rules/regexes to suppress, with optional expiration.

## AI providers and models

- **Cloud** — OpenAI, DeepSeek, Anthropic. Each has a curated catalog with economical / balanced / top models; the model is chosen in the workbench.
- **Local** — Ollama (`http://localhost:11434/v1`) and LM Studio (`http://localhost:1234/v1`). The workbench lists the models installed on your machine; no API key required.
- **Agent scope** — `lexis-guard` only answers questions about API cybersecurity and API performance. Everything else is politely refused.
- **Offline** — without a key and without local servers, deterministic stub output keeps the workflow usable.

## Data and sessions

- `~/.lexisguard/audit.log` — one line per run (used for history and trending).
- `~/.lexisguard/sessions/` — one JSON file per completed audit with the sanitized findings; loadable from the History screen.
- Findings sent to the AI are always sanitized (target hostnames are redacted), regardless of `redact_target`.

## Development

```bash
npm run build    # tsc -> dist/
npm test         # vitest suite
npx tsc --noEmit # type check
```

## Part of Excelso Open

LexisGuard is proud to be part of **Excelso Open**, the open-source and community-focused branch of Excelso that champions collaborative technology and social impact projects. Learn more about our mission and other projects at [excelso.xyz](https://excelso.xyz).

## License

LexisGuard is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) (SPDX: `PolyForm-Noncommercial-1.0.0`).

In short: you may use, copy, modify and distribute the project for **any non-commercial purpose** (research, personal study, hobby projects, educational and noncommercial organizations). Everyone who receives a copy must also receive these terms and the project's `Required Notice` line, which credits LexisGuard. Commercial use is not permitted without prior written permission from the licensor.