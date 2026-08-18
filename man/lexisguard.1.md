# lexisguard(1) — LexisGuard automated API auditing

## Name

`lexisg` — automated API security, performance and scalability auditing orchestrator.

## Synopsis

```
lexisg-cli [options]
lexisguard [options]
```

## Description

LexisGuard audits a target API against OWASP-oriented security checks, latency/payload
performance checks and rate-limit/soak scalability checks. Findings are deduplicated,
sanitized, stored as replayable sessions, summarized by an AI agent (`lexis-guard`), and
exported as JSON, Markdown or SARIF.

Running the command without `--target` opens the interactive terminal workbench (TUI).
Supplying `--target` runs a one-shot audit suitable for CI pipelines.

## Options

| Option | Description |
| ------ | ----------- |
| `-c, --config <path>` | Path to the configuration file (`.lexisrc.json`). |
| `-m, --mode <mode>` | Execution mode: `safe` or `aggressive`. |
| `-t, --target <url>` | Base URL of the API to audit (one-shot mode). |
| `-s, --spec <path>` | Path or URL to an OpenAPI/Swagger spec. |
| `-f, --format <format>` | Report format: `json`, `md`, `sarif` or `html`. Defaults to `json`. |
| `-o, --output <path>` | Output path for the report. Use `-` for stdout. |
| `--json` | JSON output to stdout (alias for `--format json --output -`). |
| `--tui` | Open the interactive workbench. |
| `--threshold <score>` | Minimum CVSS score for exit code 1. Defaults to `7.0`. |
| `--allow-exploitation` | Run gated modules that send mutating or potentially destructive payloads. |
| `--completion <shell>` | Print a shell completion script (`bash`, `zsh`, `fish` or `powershell`). |
| `-h, --help` | Show help and exit. |
| `-V, --version` | Show version and exit. |

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Audit completed; no finding at or above the severity threshold. |
| `1`  | Severity threshold exceeded (CI should fail), or an unrecoverable audit error. |
| `2`  | Invalid usage (for example, the workbench was requested without a TTY). |

## Examples

Run a one-shot audit and write a JSON report:

```bash
lexisg-cli --target api.example.com --format json --output report.json
```

Run against an OpenAPI spec and fail CI on critical findings:

```bash
lexisg-cli --target api.example.com --spec openapi.yaml --format sarif --threshold 7.0 -o report.sarif
```

Open the interactive workbench:

```bash
lexisg-cli
```

## Files

| Path | Purpose |
| ---- | ------- |
| `~/.lexisguard/audit.log` | One JSON line per run (history and trending). |
| `~/.lexisguard/sessions/` | One JSON file per completed audit with sanitized findings. |
| `~/.lexisguard/.secret` | AES-256-GCM key material for encrypted AI API keys. |
| `.lexisrc.json` | Configuration file (current directory or `--config`). |
| `.lexisignore` | Findings suppression rules with optional expiration. |

## See also

`lexisguard` project: <https://github.com/nitdraig/lexis-guard>

`man -l man/lexisguard.1.md` renders this source on Linux/macOS. On Windows, read the
Markdown source directly.
