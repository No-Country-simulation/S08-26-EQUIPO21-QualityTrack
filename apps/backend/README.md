# QualityTrack — Backend

API de QualityTrack. NestJS 12 + Prisma 7 + PostgreSQL (ver
`docs/adr/0004-stack-tecnologico.md`).

La organización interna en módulos de feature está en
`docs/adr/0005-organizacion-por-dominios.md` y `docs/backend-structure.md`.

## Requisitos

- Node.js 24 LTS
- pnpm (ver `packageManager` en el `package.json` raíz)
- Docker (para el PostgreSQL de desarrollo)

## Puesta en marcha

Desde la **raíz del repo**:

```bash
# 1. Instalar dependencias de todo el monorepo
pnpm install

# 2. Levantar PostgreSQL (Postgres 16, puerto 5433 del host)
docker compose up -d

# 3. Configurar el entorno del backend
cp apps/backend/.env.example apps/backend/.env
#   Los valores por defecto ya coinciden con compose.yml; editar solo si
#   se cambió el puerto o las credenciales. ConfigModule carga este .env
#   y valida las variables al arrancar (ver "Variables de entorno"): si
#   DATABASE_URL falta o está mal escrita, el bootstrap aborta con un
#   mensaje claro.

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

| Variable       | Obligatoria | Default       | Notas                                               |
| -------------- | ----------- | ------------- | --------------------------------------------------- |
| `DATABASE_URL` | Sí          | —             | Cadena PostgreSQL. Debe empezar con `postgresql://` |
| `PORT`         | No          | `3000`        | Puerto HTTP de la API                               |
| `NODE_ENV`     | No          | `development` | `development` \| `test` \| `production`             |

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

## Scripts

| Comando (desde la raíz)                | Qué hace                                     |
| -------------------------------------- | -------------------------------------------- |
| `pnpm dev:backend`                     | Arranca en watch mode                        |
| `pnpm --filter backend build`          | Compila a `dist/`                            |
| `pnpm --filter backend test`           | Tests unitarios (Jest)                       |
| `pnpm --filter backend test:e2e`       | Tests end-to-end                             |
| `pnpm --filter backend test:cov`       | Cobertura                                    |
| `pnpm --filter backend lint`           | oxlint                                       |
| `pnpm --filter backend prisma:migrate` | `prisma migrate dev` + generación del client |
