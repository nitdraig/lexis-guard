# LexisGuard — Estrategia de Implementación (Fases 1-3)

|              |                                                               |
| ------------ | ------------------------------------------------------------- |
| **Status**   | Plan de ejecución técnico                                     |
| **Product**  | LexisGuard — terminal-first API security & testing platform   |
| **Created**  | 2026-08-13                                                    |
| **Audience** | Maintainers, contributors                                     |

Este documento traduce la visión de `docs/vision-roadmap-2.md` en tareas concretas: qué archivo tocar, qué invariantes respetar, qué riesgos esperar y cómo verificar. Todo el código sigue `AGENTS.md`: TypeScript strict, ESM, tests sin red, findings deduplicados y sanitizados antes de cualquier reporte o sesión.

---

## 0. Invariantes transversales

Antes de cualquier fase, no romper:

1. **Scope guard**: todo request pasa por `HttpEngine` con `scope.allowed_targets`.
2. **Sanitization**: todo `Finding` que llegue a reporte, IA o sesión pasa por `Sanitizer`.
3. **Secrets**: `ai.api_key` cifrado; nunca plaintext en config o sesión.
4. **Throttle**: checks nuevos usan `HttpEngine`; nunca `fetch` crudo.
5. **Tests**: cada cambio de comportamiento lleva test unitario; sin llamadas de red.
6. **Idioma**: código y comentarios en inglés; documentación en español permitida.

---

## 1. Fase 1 — Harden & Ship v1.0

Meta: el producto actual es instalable, documentado y usable en terminal sin bloqueos.

### 1.0 Man page básica

- **Archivos nuevos**: `man/lexisguard.1.md` (fuente en Markdown), `man/lexisguard.1` (render opcional).
- **Herramienta**: `marked-man` como devDependency solo si se quiere generar roff; sino se embarca el `.md` y se documenta `man -l man/lexisguard.1.md`.
- **Contenido**: sinopsis, descripción, flags (`--target`, `--format`, `--output`, `--spec`, `--mode`, `--threshold`), exit codes, ejemplos, archivos (`~/.lexisguard/`, `.lexisrc.json`), see also.
- **Verificación**: `man -l man/lexisguard.1` (Linux/macOS); en Windows solo lectura del markdown.

### 1.1 Documentar exit codes de CLI en README

- **Archivo**: `README.md`.
- **Contenido**:
  - `0` — auditoría completada, severidad por debajo del threshold.
  - `1` — threshold de severidad excedido (CI falla).
  - `2` — error irrecuperable (scope inválido, config inválida, abort).
- **Verificación**: lectura manual; no requiere código.

### 1.2 Mostrar trending en TUI History

- **Archivos**: `src/tui/views/history.tsx`, `src/core/trending.ts`.
- **Cambio**: `computeTrend` ya existe y se usa en CLI one-shot. Reutilizarlo en la vista History para mostrar delta de counts y, si aplica, severidad ponderada.
- **Nota**: `TrendResult` tiene arrays `resolved`/`new`/`persistent` vacíos porque el audit log solo guarda counts. Para Fase 1 mostrar solo delta de counts es suficiente.
- **Tests**: agregar `tests/tui/history-trending.test.tsx` solo si el overhead de render Ink es aceptable; de lo contrario testear `computeTrend` con peso por severidad.

### 1.3 Empaquetado npm

- **Archivos**: `package.json`, `lexisg-cli.cmd`.
- **Cambios**:
  - Agregar `files: ["dist", "man", "completions", "templates"]`.
  - Agregar `prepack`: `npm run build`.
  - Agregar `repository`, `homepage`, `bugs`.
  - Verificar que `dist/cli.js` conserve shebang `#!/usr/bin/env node`.
- **Verificación**:
  - `npm pack --dry-run` incluye solo lo necesario.
  - `npm link` + `lexisg-cli --help` (en Windows re-verificar `lexisg-cli.cmd`).

### 1.4 Landing page + GitHub Pages

- **Archivos**: `site/` (Astro ya inicializado), `.github/workflows/deploy.yml`.
- **Cambios**:
  - Página mínima bilingüe: hero, features, comandos de instalación, link a docs.
  - Workflow de deploy a GitHub Pages.
- **Verificación**: `npm run build` dentro de `site/`.

### 1.5 GitHub Actions CI template

- **Archivos**: `.github/workflows/ci.yml`, `templates/github-actions.yml`.
- **Cambios**:
  - CI del repo: build, typecheck, test en Node 20/22.
  - Template para usuarios: ejemplo de job que corre `lexisg-cli --target ... --threshold high`.
- **Verificación**: push a branch y revisar checks.

### 1.6 Shell completions

- **Archivos**: `completions/lexisguard.bash`, `completions/lexisguard.zsh`, `completions/lexisguard.fish`, `completions/_lexisguard.ps1`.
- **Opción mínima**: scripts estáticos con los flags actuales.
- **Opción CI-friendly**: flag `--completion <shell>` que imprima el script correspondiente.
- **Verificación**: source manual en cada shell.

---

## 2. Fase 2 — Deepen Security, con Escalation Gate

Meta: cerrar gaps reales de OWASP API Top 10 + subset de injection, sin abrir subsistemas grandes.

### 2.1 Escalation gate

- **Archivos**: `src/core/escalation-gate.ts`, `src/modules/audit-module.ts`, `src/tui/orchestrator.ts`, `src/cli.ts`.
- **Cambios**:
  - Extender `AuditModule` con `requiresEscalation?: boolean`.
  - `EscalationGate` recibe `moduleId` + `target` y resuelve si el usuario confirmó.
  - En TUI: prompt explícito antes de iniciar el audit si algún módulo requiere escalation.
  - En CLI: flag `--allow-exploitation` para CI; sin el flag, módulos con `requiresEscalation` se saltan y se reporta como skipped.
- **Módulos bajo gate**: Injection Module, SSRF active probing, y cualquier futuro módulo con payloads mutantes/destructivos.
- **No bajo gate**: checks pasivos (headers, CORS, TLS, schema validation, secrets scanner).
- **Tests**: `tests/core/escalation-gate.test.ts` (confirmación, rechazo, skip en CLI).

### 2.2 Injection Module

- **Archivos**: `src/modules/injection-module.ts`, `src/modules/payloads/injection-payloads.ts`.
- **Alcance Fase 2**: SQLi error-based + básico blind, NoSQLi, Command Injection, Path Traversal.
- **Postergado a Fase 3**: Header Injection (CRLF), XSS reflejado vía JSON.
- **Diseño**:
  - Payloads mínimos, seguros, no destructivos.
  - Error-based: buscar patrones de error de base de datos/shell en response.
  - Blind: usar boolean-based con payloads que cambian la lógica (`AND 1=1` / `AND 1=2`); evitar time-based para no alargar la corrida.
  - Path Traversal: probes a `../../../etc/passwd` con detección de `root:x`.
- **Tag**: `requiresEscalation: true`.
- **Tests**: `tests/modules/injection-module.test.ts` con MSW simulando respuestas de error.

### 2.3 SSRF detection básico

- **Archivo**: `src/modules/ssrf-module.ts`.
- **Diseño**:
  - Detectar parámetros que aceptan URL (`url`, `endpoint`, `redirect`, `callback`).
  - Enviar probes a `http://localhost`, `http://127.0.0.1`, `http://169.254.169.254/latest/meta-data/`.
  - Reportar si la response refleja contenido interno o difiere de un valor de control.
- **Tag**: `requiresEscalation: true`.
- **Tests**: `tests/modules/ssrf-module.test.ts`.

### 2.4 JWT attack vectors

- **Archivos**: `src/modules/jwt-module.ts` (nuevo) o extensión de `security-module.ts`.
- **Diseño**:
  - Detectar JWT en headers/cookies/responses.
  - `alg: none`: cambiar a `none` y quitar firma.
  - Weak secret: probar contra wordlist interna corta (top 20 secrets). Sin agregar `jsonwebtoken`; parsear con `Buffer` + JSON.
  - Algorithm confusion: reemplazar `RS256` por `HS256` y firmar con la clave pública como HMAC secret.
- **Nota**: solo reportar si el servidor acepta el token modificado (respuesta autorizada).
- **Tests**: `tests/modules/jwt-module.test.ts`.

### 2.5 Secrets/PII scanner básico

- **Archivo**: `src/modules/secrets-scanner.ts`.
- **Diseño**:
  - Regexs conservadores para API keys (`[a-zA-Z0-9_-]{32,}` junto a palabras clave `api[_-]?key`, `token`, `secret`), private keys (`-----BEGIN`), passwords en JSON.
  - Evitar falsos positivos con allowlist de placeholders (`REDACTED`, `example`).
  - Reutilizar `Sanitizer` para redactar evidencia.
- **Tests**: `tests/modules/secrets-scanner.test.ts`.

### 2.6 Mapeo explícito OWASP API Top 10 en reportes

- **Archivos**: `src/reporter/owasp-mapping.ts`, `src/reporter/json-reporter.ts`, `src/reporter/markdown-reporter.ts`, `src/reporter/sarif-reporter.ts`, `src/types/finding.ts`.
- **Cambios**:
  - Agregar campo opcional `owasp?: string` a `Finding`.
  - Mapa `ruleId -> OWASP API Top 10 category`.
  - Incluir `owasp` en todos los formatos de reporte.
- **Tests**: `tests/reporter/owasp-mapping.test.ts`.

### 2.7 OpenAPI schema validation

- **Archivos**: `src/openapi/schema-validator.ts`, `src/modules/contract-module.ts`.
- **Diseño**:
  - Para endpoints descubiertos por `src/openapi/parser.ts`, comparar response body contra el schema declarado.
  - Agregar `ajv` como dependencia (justificado; parsing de JSON Schema a mano es error-prone y no aporta valor).
  - Reportar `type mismatch`, `missing required field`, `additional properties`.
- **Tests**: `tests/openapi/schema-validator.test.ts`.

---

## 3. Fase 3 — Quality & CI/CD

Meta: producto confiable en pipelines reales con reportes legibles para leads técnicos.

### 3.1 Regression testing

- **Archivos**: `src/core/regression.ts`, `src/core/audit-log.ts`, `src/tui/views/history.tsx`.
- **Diseño**:
  - Comparar hashes de findings entre sesión anterior y actual.
  - Requiere que `AuditLog.saveSession` guarde los hashes (revisar implementación actual; si no es así, extender sesión para incluirlos sanitizados).
  - Output: `{ resolved: Finding[], new: Finding[], persistent: Finding[] }`.
- **Tests**: `tests/core/regression.test.ts`.

### 3.2 Risk scoring compuesto

- **Archivos**: `src/core/risk-score.ts`, `src/types/finding.ts`, `src/reporter/*-reporter.ts`.
- **Diseño**:
  - Fórmula mínima: `riskScore = cvss * (1 + log2(count))` o similar.
  - Agregar `riskScore` al finding deduplicado.
  - Incluir en reportes.
- **Tests**: `tests/core/risk-score.test.ts`.

### 3.3 CI/CD templates

- **Archivos**: `templates/gitlab-ci.yml`, `templates/github-actions.yml`.
- **Contenido**: jobs de ejemplo con `--threshold high`, subida de SARIF como artifact.
- **Verificación**: lint de YAML y lectura manual.

### 3.4 Docker image

- **Archivos**: `Dockerfile`, `.dockerignore`.
- **Diseño**: Node 20 slim, multi-stage build (`npm ci --only=production`).
- **Verificación**: `docker build -t lexisguard .` y `docker run --rm lexisguard --help`.

### 3.5 Executive summary

- **Archivos**: `src/reporter/executive-summary.ts`, `src/reporter/markdown-reporter.ts`, `src/reporter/html-reporter.ts`.
- **Contenido**: score global, tendencia, top 3 recomendaciones por severidad/riesgo.
- **Tests**: `tests/reporter/executive-summary.test.ts`.

### 3.6 HTML report básico

- **Archivo**: `src/reporter/html-reporter.ts`.
- **Diseño**: HTML auto-contenido con template string, tabla de findings, severidades con color, executive summary.
- **Tests**: `tests/reporter/html-reporter.test.ts` (verificar que contenga título y al menos un finding).

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| Falsos positivos en injection / secrets | Regexs conservadores, evidencia limitada, permitir `.lexisignore` |
| Payloads destructivos en CI | Escalation gate por defecto; módulos activos se saltan sin `--allow-exploitation` |
| Tiempo de corrida excesivo | Limitar wordlists, usar blind booleano, respetar throttle |
| Nuevas dependencias | Justificar cada una; preferir stdlib; `ajv` es la única esperable en Fase 2 |
| Tests con MSW se vuelven frágiles | Mantener mocks pequeños y centrados en un comportamiento por test |

---

## 5. Definition of Done por fase

1. Todos los ítems de la fase implementados.
2. Tests nuevos pasan; tests existentes no se rompen.
3. `npm run build`, `npx tsc --noEmit`, `npm test` sin errores.
4. Docs actualizadas (`README.md`, `man/`, `docs/`).
5. Commit con mensaje claro; PR pequeño y enfocado.
