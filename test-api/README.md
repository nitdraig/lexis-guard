# LexisGuard Test API

API REST de apariencia normal (catálogo, órdenes, usuarios, búsqueda, archivos) con flaws intencionales y sutiles. Sirve para verificar que LexisGuard detecta cada regla sin depender de errores explícitos.

## Stack

- Node.js 20+
- Express + TypeScript (ESM, `module: NodeNext`)
- SQLite real vía `better-sqlite3` en `:memory:` (motor SQLite de verdad, base en memoria, determinista)

## Arranque

```bash
cd test-api
npm install
npm run build
npm start
```

Servidor: `http://localhost:3000`.

## Tokens estáticos

Los tres perfiles de auth usan JWTs firmados con HS256 y el secret débil `secret`. Se generan una sola vez y se copian al `.lexisrc.json`. Un script rápido con Node nativo:

```bash
node -e "
const { createHmac } = require('crypto');
function b64(s){ return Buffer.from(s).toString('base64url'); }
function jwt(payload){ const h=b64(JSON.stringify({alg:'HS256',typ:'JWT'})); const p=b64(JSON.stringify(payload)); const sig=createHmac('sha256','secret').update(h+'.'+p).digest('base64url'); return h+'.'+p+'.'+sig; }
console.log('USER_A:', jwt({sub:'a',role:'standard',owns:['order:1001']}));
console.log('USER_B:', jwt({sub:'b',role:'standard',owns:['order:2001']}));
console.log('ADMIN: ', jwt({sub:'admin',role:'admin'}));
"
```

En la aplicación, `src/tokens.ts` exporta los tres tokens pre-generados para no depender del script en cada arranque.

## Endpoints y reglas que disparan

| Método | Ruta | Descripción | Flaw | Regla(s) LexisGuard |
|---|---|---|---|---|
| `GET` | `/` | Landing/health | Sin HSTS, XFO, XCTO, CSP; `X-Powered-By: Express`; `Access-Control-Allow-Origin: *`; `Set-Cookie: token=eyJ...`; body JSON >50KB sin compresión; clave `session_id`; cada 11° request responde 500 | `MISSING_HSTS`, `MISSING_X_FRAME_OPTIONS`, `MISSING_X_CONTENT_TYPE_OPTIONS`, `MISSING_CSP`, `STACK_LEAK`, `CORS_WILD_CARD`, `JWT_IN_COOKIE`, `UNCOMPRESSED_LARGE_PAYLOAD`, `DATA_EXPOSURE`, `SOAK_TEST_FAILURES` |
| `GET` | `/api/products` | Listado de productos (auth) | Primer GET del spec; acepta tokens `alg:none` y HMAC con secret `secret` | `JWT_ALG_NONE_ACCEPTED`, `JWT_WEAK_SECRET` |
| `GET` | `/api/search?q=` | Búsqueda flexible | JSON con `$ne`/`$gt` → error Mongo; SQL interpolado (`LIKE '%q%'`); sin resultados → `execSync('echo ' + q)` sin comillas | `NOSQL_INJECTION`, `SQLI_ERROR_BASED`, `SQLI_BLIND_BOOLEAN`, `COMMAND_INJECTION` |
| `GET` | `/api/config` | Configuración (público) | Expone `api_key`, `db_password` y bloque RSA privado | `API_KEY_EXPOSED`, `PASSWORD_EXPOSED`, `PRIVATE_KEY_EXPOSED` |
| `GET` | `/api/inventory` | Inventario público | Spec declara `price: number`; API devuelve string `"9.99"` | `SCHEMA_CONTRACT_VIOLATION` |
| `GET` | `/api/orders/:orderId` | Orden (auth) | No verifica ownership | `BOLA_ACCESS_CROSS_USER` |
| `GET` | `/api/admin/users` | Admin (auth) | Valida token pero no rol | `BFLA_ADMIN_ACCESS` |
| `GET` | `/api/files/:filename` | Descarga de archivo | `path.join` sin sanitizar | `PATH_TRAVERSAL` |
| `GET` | `/api/url-preview?url=` | Previsualización URL | Fetch server-side sin validación | `SSRF_INTERNAL_PROBE_REFLECTED` |
| `POST` | `/api/products` | Crear producto | 201 anónimo; acepta campos desconocidos | `BROKEN_AUTH`, `MASS_ASSIGNMENT` |
| `DELETE` | `/api/orders/:orderId` | Borrar orden | 2xx anónimo | `BROKEN_AUTH` |
| `POST` | `/api/orders` | Crear orden | Requiere auth (normalidad) | — |
| `PUT` | `/api/users/:userId` | Actualizar usuario | Requiere auth (normalidad) | — |
| `PATCH` | `/api/users/:userId` | Actualizar usuario | Requiere auth (normalidad) | — |
| `HEAD/GET` | `/.env`, `/.git/config`, `/Dockerfile` | Archivos sensibles | 200 con contenido dummy | `SENSITIVE_FILE_EXPOSURE` |

Sin rate limiting, sin compresión, sin `helmet`, sin `HttpOnly` en cookies.

## Orden del spec OpenAPI (crítico)

Varios módulos usan "primeros 3 GET" y "primeros 5 mutantes" del spec. El orden propuesto:

```yaml
GET  /api/products
GET  /api/search
GET  /api/config
GET  /api/inventory
GET  /api/orders/{orderId}
GET  /api/files/{filename}
GET  /api/url-preview
GET  /api/admin/users
POST /api/products
DELETE /api/orders/{orderId}
POST /api/orders
PUT  /api/users/{userId}
PATCH /api/users/{userId}
```

## Configuración de LexisGuard

`lexisrc.example.json`:

```json
{
  "scope": {
    "allowed_targets": ["localhost"],
    "environment": "test"
  },
  "mode": "aggressive",
  "profile": "deep",
  "auth": {
    "profiles": {
      "user_a": {
        "type": "bearer",
        "token": "eyJ...USER_A...",
        "role": "standard",
        "owns": ["order:1001"]
      },
      "user_b": {
        "type": "bearer",
        "token": "eyJ...USER_B...",
        "role": "standard",
        "owns": ["order:2001"]
      },
      "admin": {
        "type": "bearer",
        "token": "eyJ...ADMIN...",
        "role": "admin"
      }
    }
  },
  "ai": {
    "provider": "openai"
  }
}
```

> `allowed_targets` usa `"localhost"` sin puerto: el scope guard extrae el hostname, no `host:port`.

## Ejecución de auditoría

```bash
# 1. API corriendo en http://localhost:3000
npm start

# 2. Auditoría one-shot
node dist/cli.js --target http://localhost:3000 \
  --spec test-api/openapi.yaml \
  --allow-exploitation \
  --format markdown \
  --output report.md
```

## Findings esperados

### Security
- `MISSING_HSTS`
- `MISSING_X_FRAME_OPTIONS`
- `MISSING_X_CONTENT_TYPE_OPTIONS`
- `MISSING_CSP`
- `CORS_WILD_CARD`
- `STACK_LEAK`
- `SENSITIVE_FILE_EXPOSURE`
- `JWT_IN_COOKIE`
- `DATA_EXPOSURE`
- `BROKEN_AUTH` (×2)
- `MASS_ASSIGNMENT`
- `BOLA_ACCESS_CROSS_USER`
- `BFLA_ADMIN_ACCESS`

### Injection (requiere `--allow-exploitation`)
- `SQLI_ERROR_BASED`
- `SQLI_BLIND_BOOLEAN`
- `NOSQL_INJECTION`
- `COMMAND_INJECTION`
- `PATH_TRAVERSAL`

### SSRF (requiere `--allow-exploitation`)
- `SSRF_INTERNAL_PROBE_REFLECTED`

### JWT
- `JWT_ALG_NONE_ACCEPTED`
- `JWT_WEAK_SECRET`

### Secrets
- `API_KEY_EXPOSED`
- `PASSWORD_EXPOSED`
- `PRIVATE_KEY_EXPOSED`

### Contract
- `SCHEMA_CONTRACT_VIOLATION`

### Performance
- `UNCOMPRESSED_LARGE_PAYLOAD`

### Scalability
- `NO_RATE_LIMIT`
- `SOAK_TEST_FAILURES` (solo en modo `aggressive`)

## Límites conocidos (no disparables por diseño)

- `HIGH_LATENCY` / `HIGH_TTFB`: root se mantiene rápido para evitar que el circuit breaker aborte la auditoría.
- `HTTP2_NOT_SUPPORTED` / `TLS_DOWNGRADE`: requieren target HTTPS; la fixture corre en HTTP local.

## Notas para Windows

- `better-sqlite3` es una dependencia nativa. En Windows suele traer binarios precompilados para Node 20; si falla, requiere Visual Studio Build Tools.
- `COMMAND_INJECTION` y `PATH_TRAVERSAL` dependen de firmas Unix (`uid=`, `root:x:`). En cmd/PowerShell puro no disparan; usar Git Bash o WSL. Alternativa: la fixture puede incluir un shim interno (invisible desde fuera) que devuelve contenido similar a `/etc/passwd` cuando el path resuelto termina en `etc/passwd`.

## Estructura de archivos propuesta

```
test-api/
  package.json
  tsconfig.json
  src/
    server.ts
    tokens.ts
  openapi.yaml
  .env
  Dockerfile
  lexisrc.example.json
  README.md
```
