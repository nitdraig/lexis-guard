import type { LandingCopy } from './types';

export const es: LandingCopy = {
  lang: 'es',
  title: 'LexisGuard',
  description:
    'Workbench y CLI de un solo paso para auditar automáticamente la seguridad, el rendimiento y la escalabilidad de APIs.',
  hero: {
    badge: 'Código abierto · Parte de Excelso Open',
    title: 'Audita tus APIs. Conoce tu postura.',
    tagline:
      'LexisGuard es un workbench de terminal y un CLI de un solo paso que ejecuta chequeos de seguridad orientados a OWASP, rendimiento y escalabilidad, y convierte los hallazgos en sesiones que puedes explorar, consultar con un agente de IA y exportar como JSON, Markdown o SARIF.',
    install: 'npm install -g lexisguard-cli',
    primaryCta: 'Empezar',
    secondaryCta: 'Ver en GitHub',
  },
  features: {
    heading: 'Todo en una terminal',
    subheading:
      'Un workbench enfocado a la auditoría automatizada de APIs — sin app web, sin backend y sin cuenta en la nube.',
    items: [
      {
        title: 'Workbench TUI persistente',
        text: 'Ejecuta lexisg-cli y configura, audita, consulta y exporta sin salir de la terminal.',
      },
      {
        title: 'Tres módulos de auditoría',
        text: 'Seguridad (headers, CORS, exposición, fugas, cookies JWT, BOLA/BFLA), Rendimiento (latencia, TTFB, compresión, HTTP/2) y Escalabilidad (ráfagas de rate-limit, carga sostenida, circuit breaker).',
      },
      {
        title: 'Seguro por diseño',
        text: 'Guardia de alcance de objetivos, timeout de 15s por petición y un throttle de 3 estados (normal / throttle / abort) para que las auditorías nunca saturen un objetivo.',
      },
      {
        title: 'Resultados en vivo',
        text: 'Los hallazgos fluyen módulo por módulo con el tiempo transcurrido y el conteo de peticiones mientras corre la auditoría.',
      },
      {
        title: 'Sesiones reproducibles',
        text: 'Cada auditoría completada se persiste. Vuelve a abrir el workbench, navega el historial, carga una sesión y sigue trabajando en sus resultados.',
      },
      {
        title: 'Consulta con IA',
        text: 'lexis-guard, un agente limitado estrictamente a ciberseguridad y rendimiento de APIs, resume la postura y responde preguntas sobre los hallazgos.',
      },
      {
        title: 'Reportes',
        text: 'JSON, Markdown y SARIF con metadatos CWE/CVSS, más supresión con .lexisignore y vencimiento.',
      },
      {
        title: 'Fallback offline determinista',
        text: 'Sin API key, todas las salidas de IA siguen disponibles mediante un motor local determinista.',
      },
    ],
  },
  usage: {
    heading: 'Uso de un solo paso',
    text: 'Ejecuta una auditoría completa desde la línea de comandos y genera un reporte en un solo paso.',
    command: 'lexisg-cli --target api.example.com --format sarif -o report.sarif',
    note: 'Ejecuta lexisg-cli --help para ver todas las opciones (--config, --mode, --spec, --json, --tui, --threshold).',
  },
  config: {
    heading: 'Configuración',
    text: 'LexisGuard lee .lexisrc.json desde el directorio actual o desde una ruta --config explícita.',
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
    note: 'Las API keys se configuran desde el workbench y se guardan cifradas con AES-256-GCM. El archivo .lexisrc.json nunca guarda una clave en texto plano.',
  },
  ai: {
    heading: 'Proveedores y modelos de IA',
    text: 'Trae tu propio proveedor o mantenlo local y sin conexión.',
    cloud: 'Nube',
    cloudItems: ['OpenAI', 'DeepSeek', 'Anthropic'],
    local: 'Local (sin API key)',
    localItems: ['Ollama — http://localhost:11434/v1', 'LM Studio — http://localhost:1234/v1'],
    offline: 'Offline — sin clave y sin servidores locales, un stub determinista mantiene el flujo utilizable.',
  },
  footer: {
    github: 'GitHub',
    excelso: 'Parte de Excelso Open',
    license: 'Licenciado bajo la PolyForm Noncommercial License 1.0.0.',
  },
};
