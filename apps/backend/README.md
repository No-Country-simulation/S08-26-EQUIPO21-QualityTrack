# QualityTrack — Backend

API de QualityTrack. NestJS 12 + Prisma 7 + PostgreSQL + object storage
S3-compatible (ver `docs/adr/0004-stack-tecnologico.md` y
`docs/adr/0010-almacenamiento-de-documentos.md`).

La organización interna en módulos de feature está en
`docs/adr/0005-organizacion-por-dominios.md` y `docs/backend-structure.md`.

## Requisitos

- Node.js 24 LTS
- pnpm (ver `packageManager` en el `package.json` raíz)
- Docker (para el PostgreSQL y el MinIO de desarrollo)

## Puesta en marcha

Desde la **raíz del repo**:

```bash
# 1. Instalar dependencias de todo el monorepo
pnpm install

# 2. Levantar la infra de desarrollo:
#    - PostgreSQL 16 en el puerto 5433 del host
#    - MinIO (object storage S3-compatible): API en :9100, consola en :9101
#    - minio-setup crea el bucket 'qualitytrack' y termina
docker compose up -d

# 3. Configurar el entorno del backend
cp apps/backend/.env.example apps/backend/.env
#   Los valores por defecto ya coinciden con compose.yml (Postgres y
#   MinIO); editar solo si se cambió un puerto o unas credenciales.
#   ConfigModule carga este .env y valida las variables al arrancar (ver
#   "Variables de entorno"): si falta una obligatoria o está mal escrita,
#   el bootstrap aborta con un mensaje claro.

# 4. Aplicar las migraciones y generar el Prisma Client
pnpm --filter backend prisma:migrate

# 5. Arrancar el backend en watch mode
pnpm dev:backend
```

## Variables de entorno

`ConfigModule` (`@nestjs/config`, registrado como global en
`app.module.ts`) carga `apps/backend/.env` y valida su contenido con
`src/config/env.validation.ts` antes de que arranque la app. Una
variable faltante o mal formada aborta el bootstrap con el detalle de
qué falló — no un error opaco del driver más adelante.

| Variable                    | Obligatoria | Default       | Notas                                                                           |
| --------------------------- | ----------- | ------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Sí          | —             | Cadena PostgreSQL. Debe empezar con `postgresql://`                             |
| `PORT`                      | No          | `3000`        | Puerto HTTP de la API                                                           |
| `NODE_ENV`                  | No          | `development` | `development` \| `test` \| `production`                                         |
| `STORAGE_ENDPOINT`          | Sí          | —             | Endpoint S3. Dev: `http://localhost:9100` (MinIO). Prod: `${{Bucket.ENDPOINT}}` |
| `STORAGE_REGION`            | Sí          | —             | Región del bucket. Dev: `us-east-1`                                             |
| `STORAGE_BUCKET`            | Sí          | —             | Nombre del bucket. Dev: `qualitytrack`                                          |
| `STORAGE_ACCESS_KEY_ID`     | Sí          | —             | Credencial S3                                                                   |
| `STORAGE_SECRET_ACCESS_KEY` | Sí          | —             | Credencial S3                                                                   |
| `STORAGE_FORCE_PATH_STYLE`  | No          | `false`       | `true` para MinIO (path-style); `false`/ausente para Railway Buckets            |

Las `STORAGE_*` configuran el object storage S3-compatible (ADR-0010):
MinIO en dev local (contenedor de `compose.yml`), Railway Storage Bucket
en producción. El código usa `@aws-sdk/client-s3` y no distingue uno de
otro — solo cambian estas variables.

El CLI de Prisma (`prisma migrate`, `prisma studio`) lee su propio
`.env` vía `prisma7.config.ts` (`import 'dotenv/config'`), independiente
de `ConfigModule`.

En despliegue (Docker/CI) las variables se inyectan por el entorno del
contenedor, no por un `.env`. `main.ts` llama `app.enableShutdownHooks()`
para que `PrismaService.onModuleDestroy()` cierre el pool de conexiones
al recibir SIGTERM/SIGINT (`docker stop`).

## Base de datos

### Configuración

- `compose.yml` (raíz): Postgres 16, DB `qualitytrack`, usuario/clave
  `postgres` / `postgres`, puerto **5433** del host.
- `apps/backend/.env`: `DATABASE_URL` (no se commitea).
- `apps/backend/prisma7.config.ts`: Prisma 7 lee la URL de acá y del
  driver adapter en `src/prisma/prisma.service.ts` — **no** de un `url`
  en `schema.prisma`.

### Migraciones

Siempre con `migrate`, **nunca `prisma db push`**: hay un índice único
parcial en `work_order` que solo vive en el SQL de las migraciones
(Prisma no lo puede representar en el schema). `db push` no lo recrea y
deja la base sin esa protección. Detalle en
`prisma/migrations/README.md`.

```bash
# Aplicar migraciones pendientes + regenerar el client
pnpm --filter backend prisma:migrate

# Crear una migración nueva a partir de cambios en schema.prisma
pnpm --filter backend exec prisma migrate dev --name <descripcion>

# Resetear la base (la borra y reaplica todo — solo en desarrollo)
pnpm --filter backend exec prisma migrate reset

# Inspeccionar la base con una GUI
pnpm --filter backend exec prisma studio
```

### Modelo de datos

`prisma/schema.prisma` es la fuente de verdad. Refleja el ERD de
`docs/architecture.md` y las decisiones de `docs/adr/`:

- 10 entidades: `Customer`, `Request`, `Quote`, `WorkOrder`,
  `RouteSheet`, `Operation`, `QualityControl`, `Document`,
  `StatusHistory`, `AppUser`.
- `AppUser`, no `User` (palabra reservada en SQL).
- Todas las FK con `onDelete: Restrict` — en este dominio nada se borra.
- `StatusHistory` es append-only (ADR-0005): solo el módulo
  `status-history` la escribe, en la misma transacción que
  `work_order.status`.
- `Document.url` guarda la **object key** del archivo en el storage, no
  una URL firmada (ADR-0010). La presigned URL de descarga se genera
  on-demand.

## Object storage

Los binarios (planos, certificados, PDF) van a un object storage
S3-compatible; en `Document` solo quedan los metadatos y la key (ADR-0010).

### Configuración

- **Dev local:** MinIO en `compose.yml` (raíz). API S3 en
  `localhost:9100`, consola web en `localhost:9101`
  (usuario/clave `minio` / `minio12345`). El servicio `minio-setup` crea
  el bucket `qualitytrack` al levantar el stack.
- **Producción:** Railway Storage Bucket vinculado al servicio backend;
  las `STORAGE_*` se definen como referencias `${{Bucket.*}}`.
- `src/storage/` expone un `StorageService` global (wrapper de
  `@aws-sdk/client-s3`) — mismo patrón que `PrismaModule`.

El código es idéntico en dev y prod: cambia solo el `.env`.

## Scripts

| Comando (desde la raíz)                | Qué hace                                     |
| -------------------------------------- | -------------------------------------------- |
| `pnpm dev:backend`                     | Arranca en watch mode                        |
| `pnpm --filter backend build`          | Compila a `dist/`                            |
| `pnpm --filter backend test`           | Tests unitarios (Vitest, ver ADR-0009)       |
| `pnpm --filter backend test:watch`     | Vitest en watch mode                         |
| `pnpm --filter backend test:e2e`       | Tests end-to-end (necesitan Postgres arriba) |
| `pnpm --filter backend test:cov`       | Cobertura (v8)                               |
| `pnpm --filter backend lint`           | oxlint                                       |
| `pnpm --filter backend prisma:migrate` | `prisma migrate dev` + generación del client |
