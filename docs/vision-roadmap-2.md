# LexisGuard — Vision &amp; Roadmap (v2 — Scope Ajustado)


|              |                                                                 |
| ------------ | --------------------------------------------------------------- |
| **Status**   | Living vision document — v2, recortado y priorizado             |
| **Product**  | LexisGuard — terminal-first API security &amp; testing platform |
| **Created**  | 2026-08-13                                                      |
| **Audience** | Maintainers, contributors, strategic planning                   |


Este documento reestructura la v1 del roadmap. Se mantiene la visión de largo plazo, pero se separa explícitamente lo que es **core ejecutable en las próximas 2 fases** de lo que **satura el producto si se intenta todo junto**. Nada se elimina — todo lo recortado queda documentado en la Sección 5 como Fase Futura, no descartado.

---

## 1. Qué es LexisGuard hoy

*(sin cambios respecto a v1 — se mantiene el estado actual íntegro)*

### 1.1 Core Identity

LexisGuard es un **deterministic-first DAST (Dynamic Application Security Testing) orchestrator** para APIs HTTP. Corre como terminal workbench (TUI) y como CLI one-shot, compartiendo el mismo pipeline de auditoría. Safe by design, AI-assisted, offline-capable.

### 1.2 Capacidades Implementadas


| Área                     | Qué funciona                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security checks**      | Missing security headers, CORS wildcard, sensitive file exposure, stack trace leaks, JWT in cookies, TLS downgrade, excessive data exposure, broken authentication, mass assignment, BOLA, BFLA |
| **Performance checks**   | High latency, high TTFB, uncompressed large payloads, HTTP/2 support detection                                                                                                                  |
| **Scalability checks**   | Rate-limit burst (10 req), soak load (aggressive mode), circuit breaker observation                                                                                                             |
| **Cross-auth testing**   | BOLA, BFLA, spec-driven path mapping                                                                                                                                                            |
| **OpenAPI discovery**    | Parse local/remote specs, extract endpoints                                                                                                                                                     |
| **AI integration**       | Cloud (OpenAI, DeepSeek, Anthropic) + local (Ollama, LM Studio) + stub offline. Router de dos niveles (triage + síntesis) + consulta interactiva                                                |
| **Safety controls**      | Scope guard (allowlist exacto de hostname), timeout 15s por request, throttle de 3 estados, auth guard (≥2 standard + 1 admin para BOLA/BFLA)                                                   |
| **Post-processing**      | Deduplicación (hash), sanitización (hostname + secretos), `.lexisignore` con expiración                                                                                                         |
| **Reports**              | JSON, Markdown, SARIF v2.1.0 con CWE/CVSS                                                                                                                                                       |
| **Sessions**             | Persistencia, replay en TUI History, trending básico                                                                                                                                            |
| **TUI workbench**        | 6 vistas: Home, Audit, Config, History, AI Consult, Export                                                                                                                                      |
| **One-shot CLI**         | `lexisg-cli --target --format --output --spec --mode --threshold` con exit codes para CI                                                                                                        |
| **Config system**        | cosmiconfig + Zod, env var interpolation, AES-256-GCM para secretos                                                                                                                             |
| **Profiles &amp; modes** | Quick/Deep, Safe/Aggressive                                                                                                                                                                     |


### 1.3 Arquitectura

```
Input (target + .lexisrc + spec OpenAPI opcional)
  → Preflight (scope guard, auth guard, lexisignore)
  → Discovery (OpenAPI parsing → endpoints)
  → Execution (HttpEngine + módulos: security → performance → scalability)
  → Post-process (dedupe → sanitize → suppress → AI triage/synthesis → report)
  → Output (JSON/MD/SARIF + session save + trending + exit code)

```

### 1.4 Stack

Node.js 20+ / TS strict / ESM · Ink 7 + React 19 · undici + p-limit + cockatiel · Vercel AI SDK v7 · cosmiconfig + Zod + dotenv · Vitest + MSW · @apidevtools/swagger-parser

### 1.5 Cobertura de tests

19 suites, todos los módulos core cubiertos, sin llamadas de red en tests unitarios.

### 1.6 ⚠️ Pendiente de resolver antes de Fase 1

No hay bloqueos arquitectónicos pendientes. Las mejoras de terminal experience que quedan (shell completions, man page) se tratan como quick wins dentro de Fase 1.

---

## 2. Qué debe llegar a ser LexisGuard

### 2.1 Visión

> El auditor de seguridad y calidad de APIs más sólido y confiable para terminal — no el más grande. Instalar, correr, confiar en el resultado. Cobertura profunda de lo esencial (OWASP API Top 10 + performance + escalabilidad) antes que cobertura ancha de todo lo posible.

Se ajusta el statement original: **"comprehensive" se redefine como "profundo en lo esencial", no "todo lo que existe en seguridad ofensiva"**. Competir en amplitud con Burp Suite, Nessus o ZAP no es realista ni deseable para un equipo chico — la ventaja competitiva de LexisGuard es terminal-first + determinismo + IA opcional, no cobertura enciclopédica.

**Usuario objetivo**: equipos de desarrollo y seguridad que auditan APIs REST/HTTP en CI/CD o local, sin configurar infraestructura pesada. No está pensado para pentesters que requieren manipulación manual profunda ni para auditors de compliance formales.

### 2.2 Principios de Diseño

Se mantienen los 8 principios de v1 sin cambios, y se agrega uno nuevo:


| Principio                                       | Significado                                                                                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terminal-first                                  | Todo funciona desde terminal. TUI interactivo, CLI para automatización.                                                                                                                                                                             |
| Universal                                       | Cualquier OS, cualquier terminal, cualquier CI. Sin dependencias GUI.                                                                                                                                                                               |
| Safe by default                                 | Nunca satura un target. Scope guard, timeouts, throttle, abort.                                                                                                                                                                                     |
| Deterministic &gt; AI                           | Scores y findings se calculan de forma determinista. IA solo anota.                                                                                                                                                                                 |
| Plugin-extensible                               | Core mínimo. Módulos extienden cobertura sin tocar el core.                                                                                                                                                                                         |
| Offline-capable                                 | Auditoría completa sin internet. IA es opcional.                                                                                                                                                                                                    |
| Reproducible                                    | Misma entrada → misma salida. Sesiones replayables.                                                                                                                                                                                                 |
| Composable                                      | Módulos seleccionables, combinables, ordenables.                                                                                                                                                                                                    |
| **🆕 Escalation gate para exploitation activa** | Cualquier módulo que ejecute payloads de explotación (inyección, SSRF activo, deserialización, etc.) requiere una confirmación explícita **adicional** al scope guard estándar. Aplica a: Injection Module, SSRF active probing y cualquier futuro módulo que envíe payloads mutantes o invoque operaciones destructivas. No aplica a checks pasivos (headers, CORS, TLS, schema validation). Ver Sección 4, Fase 2. |


### 2.3 Mapa de Capacidades — Núcleo (v1.0 → v2.0)

Esta sección reemplaza el mapa exhaustivo de v1. Solo lista lo que entra en las próximas dos fases. Todo lo demás está en la Sección 5 (Fase Futura), no perdido, solo no comprometido a corto plazo.

#### 2.3.1 Seguridad — OWASP API Top 10 (completar lo esencial)


| Check                           | Estado | Alcance recortado                                                                                              |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| API1: BOLA                      | ✅      | Ya cubierto                                                                                                    |
| API2: Broken Authentication     | ⚠️→⬜   | Agregar: weak password policy / brute-force indicators. JWT attacks se cubren en Auth &amp; Session (Fase 2)       |
| API3: Excessive Data Exposure   | ⚠️     | Se mantiene heurístico simple (campos no usados por el cliente); PII detection avanzada queda para Fase Futura |
| API4: Rate Limiting             | ✅      | Ya cubierto                                                                                                    |
| API5: BFLA                      | ✅      | Ya cubierto                                                                                                    |
| API6: Mass Assignment           | ⚠️     | Se mantiene alcance actual; probing de objetos anidados queda para Fase Futura                                 |
| API7: SSRF                      | ⬜      | Probing básico de parámetros que aceptan URL (localhost, metadata endpoints de cloud)                          |
| API8: Security Misconfiguration | ⚠️     | Agregar: CORS avanzado (origin reflection, null origin, credentials), HTTP verb tampering                      |
| API9: Improper Inventory        | ⬜      | Fase Futura                                                                                                    |
| API10: Unsafe API Consumption   | ⬜      | Fase Futura                                                                                                    |


#### 2.3.2 Seguridad — Injection (subset de alto valor, bajo la escalation gate)

Se recorta drásticamente respecto a v1. Solo los vectores más comunes en APIs REST modernas. Alta prioridad entra en Fase 2; media/baja pasa a Fase 3 o queda como quick win.


| Check                                      | Prioridad | Fase |
| ------------------------------------------ | --------- | ---- |
| SQL Injection (error-based + básico blind) | Alta      | 2    |
| NoSQL Injection                            | Alta      | 2    |
| Command Injection                          | Alta      | 2    |
| Path Traversal                             | Media     | 2    |
| Header Injection (CRLF)                    | Media     | 3    |
| XSS reflejado vía JSON                     | Baja      | 3    |


LDAP Injection, XXE, SSTI, y Deserialization Attacks se mueven a Fase Futura — son de alto esfuerzo de implementación y aplican a un subset más chico de APIs modernas (XML/SOAP legacy, deserialización específica de lenguaje).

#### 2.3.3 Seguridad — Auth &amp; Session (subset core)


| Check                                                  | Prioridad |
| ------------------------------------------------------ | --------- |
| JWT attacks (none, weak secret, key confusion)         | Alta      |
| API key leakage en responses/logs/errores              | Alta      |
| Secrets en responses (passwords, tokens, private keys) | Alta      |
| Encryption at rest indicators (MD5/SHA1 detectable)    | Media     |
| Session fixation / logout invalidation                 | Media     |
| Rate limit bypass (header spoofing)                    | Media     |


OAuth/OIDC completo (redirect URI, PKCE, scope escalation), token replay, y GDPR/data retention se mueven a Fase Futura — son subsistemas grandes por sí mismos.

#### 2.3.4 Performance &amp; Contract — extensiones de bajo costo, alto valor


| Check                                                      | Prioridad |
| ---------------------------------------------------------- | --------- |
| Error rate bajo carga (ratio 5xx durante scalability test) | Media     |
| Response consistency (misma request, distinta respuesta)   | Media     |
| OpenAPI schema validation (response vs. spec declarado)    | Alta      |
| Status code correctness                                    | Media     |
| Type mismatch detection básico                             | Media     |


Connection pooling, memory leak detection, CDN/caching analysis, load/stress/spike/endurance testing más allá del soak actual, y contract diff reports quedan en Fase Futura.

#### 2.3.5 Reporting — extensiones core


| Check                                                              | Prioridad |
| ------------------------------------------------------------------ | --------- |
| Mapeo explícito a OWASP API Top 10 en cada finding                 | Alta      |
| Executive summary (score global, tendencia, top 3 recomendaciones) | Alta      |
| Risk scoring compuesto (CVSS + frecuencia)                         | Media     |
| Trend analysis con peso por severidad (no solo conteo)             | Media     |


**Compliance mapping (NIST, SOC2, ISO27001, PCI DSS, HIPAA) se saca completamente del núcleo** y pasa a Fase Futura con una condición explícita: si se implementa, debe llevar un disclaimer visible en cada reporte generado — *"mapeo informativo, no reemplaza una auditoría de compliance certificada"* — para no generar falsa confianza en usuarios que lo tomen como validación oficial.

#### 2.3.6 Terminal Experience — quick wins


| Check                                                                            | Prioridad         |
| -------------------------------------------------------------------------------- | ----------------- |
| Shell completions (bash/zsh/fish/pwsh) | Alta |
| Man page | Media |
| Progress indicators | ✅ Ya cubierto |


Terminal multiplexer support, themes/accessibility, ASCII art reports, y clipboard export quedan en Fase Futura — mejoran pulido pero no son bloqueantes de valor.

---

## 3. Arquitectura Terminal-First

*(sin cambios respecto a v1 — se mantiene la arquitectura core, incluyendo el diseño conceptual de plugin system)*

```
┌─────────────────────────────────────────────────────────────────┐
│                        LexisGuard Core                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Config   │  │  Engine  │  │ Pipeline │  │   Report Engine  │ │
│  │  System   │  │  (HTTP)  │  │ (shared) │  │ (multi-format)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Plugin System (Fase Futura — sin cambios)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  TUI (Ink)   │  │  CLI (flags) │  │  AI Router (optional) │  │
│  │  workbench   │  │  one-shot    │  │  cloud/local/stub     │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

```

El `AuditPlugin` interface conceptual de v1 se mantiene sin cambios — sigue siendo el mecanismo correcto para que todo lo movido a Fase Futura entre después sin tocar el core.

---

## 4. Fases Estratégicas (recortadas)

### Fase 1 — Harden &amp; Ship v1.0 (ahora → 2 semanas)

Sin cambios respecto a v1:


| Paso | Trabajo                                                                                    | Esfuerzo |
| ---- | ------------------------------------------------------------------------------------------ | -------- |
| 1.0  | Man page básica                                                                            | S        |
| 1.1  | Documentar exit codes de CLI en README                                                     | S        |
| 1.2  | Mostrar trending en TUI History                                                            | S        |
| 1.3  | Empaquetado npm                                                                            | S        |
| 1.4  | Landing page + GitHub Pages                                                                | M        |
| 1.5  | GitHub Actions CI template                                                                 | S        |
| 1.6  | Shell completions                                                                          | S        |


### Fase 2 — Deepen Security, con Escalation Gate (v1.0 → v1.5)

**Meta**: cerrar los gaps reales de OWASP API Top 10 + subset de injection de alto valor. Todo módulo de exploitation activa requiere el gate del principio 2.2.


| Paso | Trabajo                                                                         | Esfuerzo |
| ---- | ------------------------------------------------------------------------------- | -------- |
| 2.1  | Escalation gate (confirmación explícita adicional para módulos de exploitation) | M        |
| 2.2  | Injection module — SQLi, NoSQLi, Command Injection (subset core)                | M        |
| 2.3  | SSRF detection básico                                                           | M        |
| 2.4  | JWT attack vectors (none, weak secret, key confusion)                           | M        |
| 2.5  | Secrets/PII scanner básico (regex sobre responses)                              | S        |
| 2.6  | Mapeo explícito OWASP API Top 10 en reportes                                    | S        |
| 2.7  | OpenAPI schema validation (response vs. spec)                                   | M        |


**Outcome**: OWASP API Top 10 casi completo, injection de alto valor cubierto, sin abrir subsistemas grandes todavía (GraphQL, OAuth completo, fuzzing engine quedan afuera).

### Fase 3 — Quality &amp; CI/CD (v1.5 → v2.0)


| Paso | Trabajo                                         | Esfuerzo |
| ---- | ----------------------------------------------- | -------- |
| 3.1  | Regression testing (comparación entre sesiones) | M        |
| 3.2  | Risk scoring compuesto (CVSS + frecuencia)      | M        |
| 3.3  | CI/CD templates (GitHub Actions, GitLab CI)     | S        |
| 3.4  | Docker image                                    | S        |
| 3.5  | Executive summary en reportes                   | S        |
| 3.6  | HTML report básico (terminal-rendered)          | M        |


**Outcome**: producto usable de forma confiable en pipelines reales, con reportes que un lead técnico o un cliente pueden leer sin traducción.

---

## 5. Fase Futura (no comprometida — backlog de largo plazo)

Todo lo siguiente **no se descarta**, se documenta como visión de 2+ años, a evaluarse fase por fase según tracción real del producto y capacidad del equipo:

- **Protocolos nuevos**: GraphQL, gRPC, WebSocket, SOAP, HTTP/3 — cada uno es un subsistema de descubrimiento y checks propio, del tamaño de lo que ya existe para REST.
- **Injection avanzada**: LDAP, XXE, SSTI, deserialización — alto esfuerzo, aplican a un subset más chico de APIs modernas.
- **OAuth/OIDC completo**: redirect URI manipulation, PKCE bypass, scope escalation — flujo complejo, merece su propio ciclo de diseño.
- **Business logic testing**: race conditions, workflow bypass, price manipulation — requieren entender contexto de negocio específico del target, difícil de generalizar en una herramienta genérica.
- **Fuzzing engine**: wordlists, mutation testing, coverage tracking — subsistema grande por sí mismo.
- **Compliance mapping**: NIST CSF, SOC 2, ISO 27001, PCI DSS, HIPAA — con el disclaimer obligatorio ya mencionado en 2.3.5.
- **Plugin marketplace + ecosistema comunitario**.
- **Team collaboration / enterprise (SSO, RBAC, audit trail)**.
- **SBOM generation** — dominio distinto (análisis de dependencias), no auditoría de API en runtime.
- **Load/stress/spike/endurance testing avanzado** más allá del soak test actual.
- **Threat modeling asistido por IA desde spec OpenAPI**.
- **Integraciones**: Jira/GitHub auto-creación de issues, webhooks Slack/Teams/Discord.
- **Terminal experience avanzada**: themes, accesibilidad, ASCII charts, clipboard export.

---

## 6. Non-Goals (sin cambios respecto a v1)

- Auto-remediación — LexisGuard detecta y reporta, no modifica targets.
- Network-level DAST — producto orientado a API (HTTP/HTTPS), no infraestructura de red.
- Browser/DOM testing — no es scanner de aplicación web (sin Selenium/Playwright).
- Wildcard scope — hostname exacto sigue siendo la regla.
- AI overwriting severity — la IA anota y explica, el score determinista es innegociable.
- Commercial SaaS hosting — self-hosted.
- GUI application — terminal-first siempre.

---

## 7. Métricas de Éxito (ajustadas)


| Métrica             | Target v2                                                                      |
| ------------------- | ------------------------------------------------------------------------------ |
| OWASP API Top 10    | Cobertura completa de los checks aplicables (no 100% literal de sub-variantes) |
| Injection core      | SQLi, NoSQLi, Command Injection, SSRF cubiertos con escalation gate            |
| Formatos de reporte | JSON, Markdown, SARIF, HTML                                                    |
| CI/CD templates     | GitHub Actions, GitLab CI                                                      |
| Cobertura de tests  | &gt;80% líneas                                                                 |
| Instalación         | `npm i -g lexisguard` → funcionando en &lt;2 min                               |
| Offline             | Auditoría completa sin internet                                                |


Se sacan del corto plazo: cobertura de 4+ CI templates, 6 frameworks de compliance, 10 plugins comunitarios, soporte a 5 protocolos — quedan como aspiración de Fase Futura, no como meta medible de v1.0-v2.0.

---

## 8. Próximos Pasos

1. Completar los quick wins de terminal experience (shell completions, man page) en Fase 1.
2. Diseñar el escalation gate de exploitation activa (2.1 de Fase 2) antes de escribir el primer módulo de injection — es una decisión de seguridad, no de feature.
3. Ejecutar Fase 1 → shippear v1.0.
4. Iterar fase por fase; revisar este documento después de cada fase con datos reales de uso, no solo con la lista de deseos original.

---

*Documento v2 — recorta y prioriza sobre la visión original. Nada se pierde, todo lo saturante queda en Sección 5 como decisión consciente, no como olvido.*