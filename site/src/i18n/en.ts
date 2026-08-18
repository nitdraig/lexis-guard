import type { LandingCopy } from './types';

export const en: LandingCopy = {
  lang: 'en',
  title: 'LexisGuard',
  description:
    'Automated API security, performance and scalability auditing workbench and one-shot CLI.',
  hero: {
    badge: 'Open source · Part of Excelso Open',
    title: 'Audit your APIs. Know your posture.',
    tagline:
      'LexisGuard is a terminal workbench and one-shot CLI that runs OWASP-oriented security, performance and scalability checks, then turns the findings into sessions you can explore, consult with an AI agent, and export as JSON, Markdown or SARIF.',
    install: 'npm install -g lexisguard-cli',
    primaryCta: 'Get started',
    secondaryCta: 'View on GitHub',
  },
  features: {
    heading: 'Everything in one terminal',
    subheading:
      'A focused workbench for automated API auditing — no web app, no backend, no cloud account required.',
    items: [
      {
        title: 'Persistent TUI workbench',
        text: 'Launch lexisg-cli and configure, audit, consult and export without leaving the terminal.',
      },
      {
        title: 'Three audit modules',
        text: 'Security (headers, CORS, exposure, leaks, JWT cookies, BOLA/BFLA), Performance (latency, TTFB, compression, HTTP/2) and Scalability (rate-limit burst, soak load, circuit breaker).',
      },
      {
        title: 'Safe by design',
        text: 'Target scope guard, a 15s per-request timeout and a 3-state throttle (normal / throttle / abort) so audits never hammer a target.',
      },
      {
        title: 'Live results',
        text: 'Findings stream module-by-module with elapsed time and request count while the audit runs.',
      },
      {
        title: 'Replayable sessions',
        text: 'Every completed audit is persisted. Reopen the workbench, browse history, load a session and keep working on its results.',
      },
      {
        title: 'AI consultation',
        text: 'lexis-guard, an agent scoped strictly to API cybersecurity and API performance, summarizes the posture and answers questions about the findings.',
      },
      {
        title: 'Reports',
        text: 'JSON, Markdown and SARIF with CWE/CVSS metadata, plus .lexisignore suppression with expiration enforcement.',
      },
      {
        title: 'Deterministic offline fallback',
        text: 'Without an API key, every AI output stays available through a local deterministic engine.',
      },
    ],
  },
  usage: {
    heading: 'One-shot usage',
    text: 'Run a full audit from the command line and write a report in one step.',
    command: 'lexisg-cli --target api.example.com --format sarif -o report.sarif',
    note: 'Run lexisg-cli --help for all options (--config, --mode, --spec, --json, --tui, --threshold).',
  },
  config: {
    heading: 'Configuration',
    text: 'LexisGuard reads .lexisrc.json from the current directory or an explicit --config path.',
    example: `{
  "scope": { "allowed_targets": ["api.example.com"], "environment": "production" },
  "mode": "safe",
  "profile": "deep",
  "auth": {
    "profiles": {
      "user_a": { "type": "bearer", "token": "\${LEXIS_USER_A_TOKEN}", "role": "standard", "owns": ["order:1001"] },
      "user_b": { "type": "bearer", "token": "\${LEXIS_USER_B_TOKEN}", "role": "standard", "owns": ["order:2001"] },
      "admin":  { "type": "bearer", "token": "\${LEXIS_ADMIN_TOKEN}",  "role": "admin" }
    }
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-5.4-nano",
    "api_key": "",
    "redact_target": true,
    "local_fallback": true
  },
  "limits": { "max_concurrent_requests": 20, "max_requests_per_test": 500 }
}`,
    note: 'API keys are set through the workbench and stored AES-256-GCM encrypted. The .lexisrc.json file never holds a plaintext key.',
  },
  ai: {
    heading: 'AI providers and models',
    text: 'Bring your own provider, or keep it local and offline.',
    cloud: 'Cloud',
    cloudItems: ['OpenAI', 'DeepSeek', 'Anthropic'],
    local: 'Local (no API key)',
    localItems: ['Ollama — http://localhost:11434/v1', 'LM Studio — http://localhost:1234/v1'],
    offline: 'Offline — without a key and without local servers, a deterministic stub keeps the workflow usable.',
  },
  footer: {
    github: 'GitHub',
    excelso: 'Part of Excelso Open',
    license: 'Licensed under the PolyForm Noncommercial License 1.0.0.',
  },
};
