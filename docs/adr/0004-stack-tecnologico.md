# ADR-0004: Stack tecnológico del proyecto

**Estado:** Aceptada
**Fecha:** 2026-09-05
**Deciders:** Backend

## Contexto

QualityTrack necesita fijar su stack tecnológico (lenguaje, framework de
API, framework de frontend, motor de base de datos, ORM, gestor de
paquetes, storage de archivos) antes de empezar el setup del proyecto,
para no bloquear al resto del equipo.

Parte del stack ya estaba materializado en el repo como scaffolding
inicial —monorepo `pnpm`, TypeScript, NestJS en `apps/backend`, React
previsto en `apps/frontend`, Jest, oxlint, Husky + commitlint— pero sin
un ADR que registrara la decisión ni las alternativas evaluadas. Las dos
piezas todavía abiertas eran el **motor de base de datos** y el **ORM**.

El equipo de backend es, en la práctica, una sola persona, así que la
decisión recae sobre ese rol. El resto del equipo (frontend, QA, UX/UI,
data analyst) consume el resultado.

Restricciones que pesan en la decisión:

- **Criterio de éxito del MVP:** reconstruir el historial completo de una
  OT —documentos incluidos— desde una sola pantalla. El endpoint
  `GET /work-orders/:id/dossier` (ver `docs/architecture.md`) es un join
  de casi todo el esquema.
- **Modelo de datos relacional y transaccional:** 10 entidades con claves
  foráneas (`CUSTOMER → REQUEST → QUOTE → WORK_ORDER → ROUTE_SHEET →
OPERATION`, más `QUALITY_CONTROL`, `DOCUMENT`, `STATUS_HISTORY`).
- **Regla de dominio dura:** toda transición de estado de una
  `WORK_ORDER` inserta una fila en `STATUS_HISTORY` en la **misma
  transacción** que actualiza `WORK_ORDER.status`.
- **Reportes de agregación:** tiempos por etapa y no conformidades
  (coordinados con Data Analyst) son agregaciones sobre datos
  relacionales.
- **Volumen de documentos:** el negocio maneja muchos PDF e imágenes
  (planos, certificados, comprobantes), pero el ERD ya modela
  `DOCUMENT { type, url }` — los binarios no van en la base de datos.
- **Nivel del equipo:** varios integrantes están aprendiendo; se
  prioriza DX, tipado y documentación abundante sobre flexibilidad de
  bajo nivel.

## Decisión

| Capa                   | Elección                                              |
| ---------------------- | ----------------------------------------------------- |
| Lenguaje               | TypeScript (`strict`)                                 |
| Runtime                | Node.js 24 LTS                                        |
| Gestor de paquetes     | pnpm (workspaces / monorepo)                          |
| Framework de API       | NestJS 12                                             |
| Framework de frontend  | React 19 (Vite)                                       |
| Motor de base de datos | PostgreSQL                                            |
| ORM                    | Prisma                                                |
| Storage de archivos    | Object storage (S3-compatible), URL en `DOCUMENT.url` |
| Testing                | Jest (unit + integración), Supertest para HTTP        |
| Lint / formato         | oxlint + Prettier                                     |

### Motor de base de datos: PostgreSQL

El modelo de datos es intensamente relacional y transaccional. El
endpoint del expediente único es un join de casi todo el esquema, y la
regla `STATUS_HISTORY` append-only exige transacciones multi-tabla como
operación cotidiana, no como excepción. Los reportes de agregación son
`GROUP BY` sobre datos relacionales. PostgreSQL cubre las tres cosas de
forma nativa. La documentación existente (`CLAUDE.md`,
`docs/architecture.md`, ADR-0003) ya asumía PostgreSQL —la nota sobre
`APP_USER` como nombre de tabla en vez de `USER`, palabra reservada en
PostgreSQL, y el comentario sobre `amount` nullable en ADR-0003.

### ORM: Prisma

Schema único (`schema.prisma`) como fuente de verdad del modelo,
migraciones declarativas versionadas, tipado generado extremo a extremo,
y documentación abundante — encaja con un equipo donde parte de la gente
está aprendiendo. Integra con NestJS vía un `PrismaService` inyectable.

### Storage de archivos

Los PDF e imágenes viven en un object storage S3-compatible; la base de
datos guarda solo metadatos y la clave/URL en `DOCUMENT.url`, tal como ya
lo modela el ERD. El proveedor concreto (S3, R2, Supabase Storage, GCS,
MinIO en local) se define en un ADR posterior según dónde se despliegue
el sistema — no bloquea el setup.

## Opciones consideradas

### Lenguaje / framework de API

#### Opción A: TypeScript + NestJS — elegida

**Pros:** un solo lenguaje en todo el monorepo (backend, frontend,
`shared-types`); NestJS impone estructura (módulos, DI, capas) que ayuda
a un equipo chico a mantener consistencia sin discutir arquitectura en
cada PR; ecosistema grande y documentación oficial extensa; ya estaba
scaffoldeado en el repo.
**Cons:** NestJS tiene una curva inicial (decoradores, providers,
módulos) y agrega ceremonia frente a un framework minimalista.

#### Opción B: TypeScript + Express/Fastify plano

**Pros:** menos ceremonia, arranque más rápido para un CRUD simple.
**Cons:** sin estructura impuesta, cada quien resuelve capas y
organización a su manera — riesgo alto en un equipo que está aprendiendo;
habría que construir a mano lo que NestJS ya trae (validación, DI,
testing utils).

#### Opción C: Otro lenguaje (Python/FastAPI, Go, Java/Spring)

**Pros:** algunos ofrecen mejor performance bruta o tipado más estricto.
**Cons:** rompe el "un solo lenguaje" del monorepo, obliga a mantener
tipos duplicados entre frontend y backend, y aleja al único backend de su
zona de mayor productividad. Ninguna ventaja compensa eso para el alcance
del MVP.

### Motor de base de datos

#### Opción A: PostgreSQL — elegida

| Dimensión                                       | Evaluación                   |
| ----------------------------------------------- | ---------------------------- |
| Ajuste al modelo relacional (10 entidades, FKs) | Alto                         |
| Join del expediente único                       | Nativo, una query            |
| Transacciones multi-tabla (`STATUS_HISTORY`)    | Nativas, operación cotidiana |
| Agregaciones para reportes                      | `GROUP BY` nativo            |
| Coherencia con la documentación ya escrita      | Total (ya asumía PostgreSQL) |

**Pros:** cubre join, transacciones y agregación de forma nativa; ACID;
la documentación existente ya lo daba por hecho.
**Cons:** requiere definir y versionar un esquema desde el inicio — menos
margen para cambiar la forma de los datos sobre la marcha.

#### Opción B: MongoDB

Se evaluó por el volumen de documentos (PDF, imágenes) del negocio.

**Pros:** flexible para datos sin esquema fijo; escritura simple de
documentos anidados.
**Cons decisivos:**

- El volumen de PDF/imágenes **no** es un argumento a favor: los binarios
  no van en la base de datos en ningún motor. El ERD ya modela
  `DOCUMENT { type, url }` — los archivos van a object storage y la BD
  guarda la referencia. GridFS es una solución de nicho que no se elige
  teniendo object storage.
- El expediente único obliga a `$lookup` en cascada (joins, la operación
  que MongoDB hace peor) o a desnormalizar y pelear con la consistencia.
- La regla `STATUS_HISTORY` append-only en la misma transacción que
  `WORK_ORDER.status` necesita transacciones multi-documento, que en
  MongoDB son la excepción cara y no el modo natural.
- Contradice la documentación ya escrita (`APP_USER`, `amount` nullable,
  ERD relacional).

#### Opción C: MySQL / MariaDB

**Pros:** relacional, ACID, cumpliría los requisitos funcionales.
**Cons:** sin ventaja frente a PostgreSQL para este caso; peor soporte
histórico de tipos y de features avanzadas (JSONB, tipos array, CTEs
recursivas por si hicieran falta en reportes); desalineado con la nota de
palabra reservada `USER` ya documentada, que es específica de PostgreSQL
y el estándar SQL.

### ORM

#### Opción A: Prisma — elegida

**Pros:**

- `schema.prisma` como fuente de verdad única del modelo — legible por
  todo el equipo, no solo por backend.
- Migraciones declarativas versionadas (`prisma migrate`).
- Tipado generado extremo a extremo: el cliente conoce la forma exacta de
  cada query, incluidos los `include` del expediente único.
- Documentación abundante y mensajes de error claros — importa con gente
  aprendiendo.

**Cons:** capa de abstracción propia (no es SQL directo); para queries de
agregación muy específicas de los reportes puede hacer falta
`$queryRaw` — aceptable y previsto.

#### Opción B: TypeORM

**Pros:** históricamente el ORM que la documentación de NestJS usa en sus
ejemplos; basado en decoradores sobre entidades, idiomático con el estilo
NestJS.
**Cons:** migraciones y tipado más frágiles (el tipo de una entidad no
siempre refleja lo que devuelve una query con relaciones); histórico de
issues de mantenimiento y comportamientos sorpresa en el lazy loading.

#### Opción C: Drizzle

**Pros:** SQL-first, muy tipado, ligero, sin capa de abstracción pesada;
buen control del SQL generado.
**Cons:** comunidad más nueva, menos ejemplos con NestJS, menos material
de aprendizaje. El control fino de SQL que ofrece no es una necesidad del
MVP y sí una carga cognitiva extra para el equipo.

### Frontend

React 19 con Vite. Elegido por alineación con el resto del stack
(TypeScript, `shared-types` compartidos), por ser lo previsto en el repo
(`packages/eslint-config/react.js` ya existe) y por ser el ecosistema con
más recursos de aprendizaje para el equipo de frontend. El detalle de
librerías de UI, routing y data-fetching lo define el rol de frontend en
su propio ADR o README.

## Consecuencias

- El setup del backend puede arrancar: `pnpm add -D prisma`,
  `pnpm add @prisma/client`, `prisma init`, y traducir el ERD de
  `docs/architecture.md` a `schema.prisma`.
- Hace falta un PostgreSQL local para desarrollo — se documenta un
  `docker-compose.yml` con Postgres en el README del backend.
- El `PrismaService` se expone como módulo global de NestJS para
  inyectarlo en los repositorios/servicios.
- Toda transición de estado de `WORK_ORDER` se implementa dentro de una
  transacción Prisma (`$transaction`) que inserta en `STATUS_HISTORY` y
  actualiza `WORK_ORDER.status` juntas — la regla de dominio se traduce
  directo a esa primitiva.
- Los reportes de agregación que no encajen en el query builder de Prisma
  usan `$queryRaw` con SQL parametrizado, coordinados con Data Analyst.
- Queda pendiente un ADR para el proveedor de object storage, atado a la
  decisión de despliegue.
- La sección **Stack** de `CLAUDE.md` se actualiza en el mismo PR que
  este ADR.

## Action Items

1. [ ] Agregar Prisma al `apps/backend` y traducir el ERD a
       `schema.prisma`.
2. [ ] Agregar `docker-compose.yml` con PostgreSQL para desarrollo local
       y documentarlo en `apps/backend/README.md`.
3. [ ] Crear el `PrismaModule` / `PrismaService` global en NestJS.
4. [ ] Inicializar `apps/frontend` con React 19 + Vite.
5. [ ] Crear el ADR del proveedor de object storage cuando se decida el
       despliegue.
