# ADR-0010: Proveedor de object storage — MinIO en desarrollo, Railway Buckets en producción

**Estado:** Aceptada
**Fecha:** 2026-09-08
**Deciders:** Backend

> Cierra el action item 5 de ADR-0004 ("Crear el ADR del proveedor de
> object storage cuando se decida el despliegue") y el pendiente que
> `CLAUDE.md` marca como "(proveedor pendiente de ADR)" en la fila de
> Storage.

## Contexto

El ERD ya modela `DOCUMENT { id, work_order_id, type, url }` y tanto
`CLAUDE.md` como ADR-0004 fijan que los binarios (planos, certificados,
PDF, comprobantes) **nunca** van a la base de datos: van a un object
storage S3-compatible y la BD guarda solo metadatos y la referencia en
`DOCUMENT.url`. Lo que ADR-0004 dejó explícitamente abierto es **qué
proveedor concreto**, atado a la decisión de despliegue.

El despliegue ya está decidido: **Railway**, con deploy automatizado por
una GitHub Action. Railway ofrece **Storage Buckets** nativos:

- Object storage privado, S3-compatible real — funciona con
  `@aws-sdk/client-s3` sin adaptadores. Soporta Put/Get/Head/Delete,
  List, Copy, **presigned URLs**, multipart uploads y object tagging.
- Una instancia de bucket **por environment**, con credenciales
  aisladas: el environment de producción no comparte bucket ni claves
  con el de desarrollo o preview.
- Expone al servicio vinculado las variables `BUCKET`, `ACCESS_KEY_ID`,
  `SECRET_ACCESS_KEY`, `ENDPOINT` (ej. `https://t3.storageapi.dev`) y
  `REGION`.
- Precio: US$0.015 por GB-mes de almacenamiento; operaciones de API y
  egress sin costo. Para el volumen del MVP, centavos.
- Limitaciones: solo buckets privados (no hay URL pública permanente —
  se sirve por presigned URL), sin versionado, sin server-side
  encryption, sin backups automáticos, sin private networking.

Para **desarrollo local** ya hay un patrón establecido: `compose.yml` en
la raíz levanta PostgreSQL, y `docker compose up -d` es el paso 2 de la
puesta en marcha (`apps/backend/README.md`). El object storage local
debería seguir el mismo patrón: un servicio más en ese `compose.yml`, no
un proveedor en la nube que cada dev tenga que provisionar, ni
credenciales compartidas por chat.

## Decisión

### Proveedor

| Entorno          | Proveedor                               | Cómo se configura                                                       |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Desarrollo local | **MinIO** (contenedor en `compose.yml`) | `.env` con defaults que apuntan a `http://localhost:9100`               |
| Producción       | **Railway Storage Bucket**              | Bucket vinculado al servicio backend; variables mapeadas con `${{...}}` |

MinIO es un servidor open-source que implementa la API de S3. El código
de la aplicación no distingue uno de otro: la única diferencia entre
dev y prod es el valor de las variables de entorno (`endpoint`,
credenciales, nombre de bucket). Misma API, mismo SDK, mismo código de
`StorageService`.

### Interfaz en el código

Un `StorageModule` **global** (mismo patrón que `PrismaModule`, ADR-0005)
expone un `StorageService` inyectable, wrapper delgado sobre
`@aws-sdk/client-s3`:

```ts
// storage/storage.service.ts
putObject(key: string, body: Buffer, contentType: string): Promise<void>
getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>
deleteObject(key: string): Promise<void>   // reservado; en este dominio nada se borra
```

El cliente S3 se construye una sola vez con la config de entorno:

```ts
new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: env.STORAGE_FORCE_PATH_STYLE, // true para MinIO, false/ausente para Railway
});
```

### Qué se guarda en `DOCUMENT.url`

Se guarda la **object key** (ej. `work-orders/<id>/<uuid>-plano.pdf`),
**no** una URL firmada. Las presigned URLs expiran; persistir una dejaría
`DOCUMENT.url` apuntando a un link muerto. La URL firmada se genera
**on-demand** cuando un cliente pide descargar el documento
(`getSignedDownloadUrl(document.url)`), con una expiración corta (orden
de minutos).

El nombre de la columna sigue siendo `url` (ya está en el ERD y el
schema); su contenido es la key. Un comentario en `schema.prisma` lo
aclara.

### Variables de entorno

Se usan nombres con prefijo `STORAGE_` en nuestro código y en
`.env.example`. Railway expone las suyas **sin prefijo** (`BUCKET`,
`ACCESS_KEY_ID`, ...), que son genéricas y chocarían con otras; en el
environment de producción se mapean con referencias de variable de
Railway:

```
STORAGE_ENDPOINT=${{Bucket.ENDPOINT}}
STORAGE_REGION=${{Bucket.REGION}}
STORAGE_BUCKET=${{Bucket.BUCKET}}
STORAGE_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
STORAGE_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
```

`src/config/env.validation.ts` valida las cinco al arrancar (fail-fast,
igual que `DATABASE_URL`): si falta una, el bootstrap aborta con el
detalle de cuál. `STORAGE_FORCE_PATH_STYLE` es opcional (default
`false`); en dev el `.env.example` lo trae en `true`.

### Dónde vive el manejo de archivos

`DOCUMENT` ya está asignado al módulo `dossier` (ADR-0005,
`docs/backend-structure.md`). La subida y el listado de documentos de una
OT (`documents.controller.ts`) viven ahí. Esto introduce una escritura en
un módulo que ADR-0005 describe como "solo lectura": la resolución es
acotar la excepción, no rediseñar. `dossier` sigue sin tocar
`work_order.status` ni `status_history` — esas son las invariantes que
ADR-0005 protege. Escribir una fila `DOCUMENT` y subir su binario a
storage es una operación de metadatos independiente de la máquina de
estados. Se documenta en `docs/backend-structure.md` que `dossier`
compone el expediente (lectura) **y** administra el alta de `DOCUMENT`
(escritura acotada a esa entidad).

## Opciones consideradas

### Proveedor de producción

#### Opción A: Railway Storage Bucket — elegida

| Dimensión                               | Evaluación                                                      |
| --------------------------------------- | --------------------------------------------------------------- |
| Integración con el despliegue (Railway) | Nativa — bucket como recurso del proyecto, variables inyectadas |
| S3-compatible con `@aws-sdk/client-s3`  | Total — Put/Get/Delete/List, presigned URLs, multipart          |
| Cuentas / paneles extra a administrar   | Ninguno — mismo dashboard que el resto de la infra              |
| Aislamiento entre entornos              | Por environment, con credenciales separadas                     |
| Costo para el MVP                       | Despreciable (US$0.015/GB-mes, egress y ops gratis)             |

**Pros:** cero infraestructura adicional que aprovisionar o mantener; las
credenciales viven en Railway y nunca pasan por el repo ni por chat; el
aislamiento por environment sale de fábrica; la GitHub Action de deploy
no necesita saber nada de storage.
**Cons:** acopla el storage a Railway (mitigado: la interfaz es S3
estándar, migrar a otro proveedor S3 es cambiar variables de entorno);
sin versionado ni server-side encryption ni backups automáticos —
aceptable para el MVP, revisable si el negocio lo exige.

#### Opción B: AWS S3 directo

**Pros:** el proveedor S3 de referencia, la implementación más madura.
**Cons:** otra cuenta cloud que crear y facturar aparte de Railway; hay
que gestionar un usuario IAM, su política y sus claves, y meterlas como
secrets en Railway y en la GitHub Action a mano. Toda esa ceremonia para
guardar unos PDF, sin ninguna ventaja sobre el bucket que Railway ya
ofrece integrado.

#### Opción C: Cloudflare R2 / Supabase Storage / Backblaze B2

**Pros:** todos S3-compatibles; R2 sin cargos de egress; Supabase Storage
si además se usara Supabase para algo más.
**Cons:** mismo problema que la Opción A pero peor — un proveedor más,
desacoplado del despliegue, con su propio panel y su propia facturación,
sin usar nada más de esa plataforma. No se justifica cuando el proveedor
del deploy ya trae object storage.

#### Opción D: Binarios en PostgreSQL (`bytea` / Large Objects)

**Descartada de entrada.** ADR-0004 ya lo rechazó explícitamente: infla
la base y sus backups, degrada el join del expediente único, y el ERD
modela `DOCUMENT { type, url }` justamente para no hacer esto.

### Object storage en desarrollo local

#### Opción A: MinIO en `compose.yml` — elegida

| Dimensión                         | Evaluación                                        |
| --------------------------------- | ------------------------------------------------- |
| Consistencia con el patrón actual | Total — mismo `docker compose up -d` que Postgres |
| Funciona sin conexión a internet  | Sí                                                |
| Aislamiento entre devs            | Total — cada máquina su propio storage            |
| Fidelidad a producción            | Alta — misma API S3, motor distinto               |
| Inspección visual de lo subido    | Sí — consola web de MinIO en `:9101`              |

**Pros:** encaja exacto con cómo ya se levanta Postgres; no depende de
credenciales cloud compartidas ni de que un bucket remoto esté sano; la
consola web ayuda a un equipo que está aprendiendo a _ver_ qué se subió.
**Cons:** un servicio más en `compose.yml` y ~200 MB de imagen; MinIO no
es idéntico byte a byte a Railway (distinto motor S3) — mitigado porque
la superficie que usamos (Put, Get, presigned URL, Delete) es la parte
más estandarizada de la API.

#### Opción B: Desarrollo local contra un bucket de Railway (dev/preview)

**Pros:** el mismo proveedor exacto que producción, sin imagen extra.
**Cons:** no funciona offline; todo el equipo comparte el mismo bucket de
dev (un dev borra o pisa lo de otro); requiere repartir credenciales de
Railway por fuera del repo; Railway no tiene file explorer para
inspeccionar a ojo. Rompe el patrón "todo el stack local sale de
`compose.yml`".

#### Opción C: Adaptador a filesystem local en dev

Un `StorageService` que en dev escribe a una carpeta y en prod habla S3.

**Pros:** cero contenedores extra.
**Cons:** dos implementaciones del servicio que mantener y testear en
paralelo; el path de dev no ejercita presigned URLs, multipart ni el
manejo de errores de S3 — se descubren recién en producción. Contradice
el objetivo de que dev y prod difieran solo en configuración.

## Consecuencias

- **Dependencias backend:** se agrega `@aws-sdk/client-s3` y
  `@aws-sdk/s3-request-presigner`.
- **`compose.yml` (raíz):** se agrega el servicio `minio`
  (API en `:9100`, consola en `:9101` del host — desplazados para no
  chocar con portainer/túneles; volumen `minio_data`, healthcheck)
  y un servicio `minio-setup` de un solo uso que crea el bucket
  `qualitytrack` al levantar el stack. Postgres no cambia.
- **`apps/backend/.env.example`:** se agregan `STORAGE_ENDPOINT`,
  `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`,
  `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE`, con defaults de
  MinIO local.
- **`src/config/env.validation.ts` + `EnvVars`:** las cinco variables
  `STORAGE_*` obligatorias entran en la validación fail-fast;
  `STORAGE_FORCE_PATH_STYLE` opcional (booleano, default `false`).
- **`src/storage/`:** nuevo `StorageModule` global + `StorageService`
  (wrapper de `@aws-sdk/client-s3`). Sin lógica de negocio, igual que
  `PrismaModule`.
- **`src/modules/dossier/`:** `documents.controller.ts` +
  `documents.service.ts` manejan alta y listado de `DOCUMENT`;
  `documents.service.ts` usa `StorageService` para el binario y el
  repositorio de Prisma para la fila. `GET /documents/:id/download`
  responde una redirección a la presigned URL.
- **`schema.prisma`:** comentario en `Document.url` aclarando que
  contiene la object key, no una URL.
- **Railway (producción):** el bucket se crea en el canvas del proyecto y
  se vincula al servicio backend; las variables `STORAGE_*` se definen
  como referencias `${{Bucket.*}}`. La GitHub Action de deploy no cambia.
- **Docs:** `CLAUDE.md` (fila de Storage), `docs/adr/0004` (nota de
  cierre del action item 5), `apps/backend/README.md` (requisitos, puesta
  en marcha, tabla de variables), `docs/backend-structure.md` (el módulo
  `dossier` administra el alta de `DOCUMENT`; nuevo `src/storage/`),
  `docs/architecture.md` si hace falta aclarar el contenido de
  `DOCUMENT.url`.
- **Pendiente para cuando se implemente:** límite de tamaño de archivo y
  lista blanca de `content-type` aceptados en el DTO de subida;
  estrategia de nombres de key; si la subida usa multipart directo del
  cliente (presigned PUT) o pasa por la API.

## Cómo se cumplen las reglas

| Regla / criterio                                     | Dónde se implementa                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Los binarios nunca van a la base de datos            | `documents.service.ts` sube el binario a storage vía `StorageService`; en `DOCUMENT` solo la key |
| Dev y prod difieren solo en configuración            | Un único `StorageService` sobre `@aws-sdk/client-s3`; cambia el `.env`, no el código             |
| El stack de desarrollo sale de `compose.yml`         | `minio` + `minio-setup` junto a `postgres`; `docker compose up -d` levanta todo                  |
| Config inválida aborta el arranque con mensaje claro | Las cinco `STORAGE_*` entran en `src/config/env.validation.ts` (fail-fast)                       |
| El expediente único muestra los documentos de la OT  | `dossier.service.ts` incluye la lista de `DOCUMENT`; el front pide la presigned URL al descargar |
| En este dominio nada se borra                        | `deleteObject` queda como método reservado; el CRUD de documentos no lo expone en el MVP         |

## Action Items

1. [ ] `compose.yml`: agregar servicios `minio` y `minio-setup` (crea el
       bucket `qualitytrack`). Documentar puertos `9100`/`9101` en
       `apps/backend/README.md`.
2. [ ] `apps/backend/.env.example`: agregar las seis variables `STORAGE_*`
       con defaults de MinIO local.
3. [ ] `src/config/env.validation.ts` + `EnvVars`: validar las cinco
       `STORAGE_*` obligatorias y `STORAGE_FORCE_PATH_STYLE` opcional.
4. [ ] `pnpm --filter backend add @aws-sdk/client-s3
    @aws-sdk/s3-request-presigner`.
5. [ ] `src/storage/`: `StorageModule` global + `StorageService`
       (`putObject`, `getSignedDownloadUrl`, `deleteObject`).
6. [ ] `src/modules/dossier/`: `documents.controller.ts` +
       `documents.service.ts` (alta, listado, `GET /documents/:id/download`
       → presigned URL). DTO de subida con límite de tamaño y whitelist
       de `content-type`.
7. [ ] `schema.prisma`: comentario en `Document.url` (contiene la object
       key, no una URL).
8. [ ] Producción: crear el bucket en Railway, vincularlo al servicio
       backend, definir las `STORAGE_*` como referencias `${{Bucket.*}}`.
9. [ ] Actualizar `CLAUDE.md`, `docs/adr/0004`, `apps/backend/README.md`
       y `docs/backend-structure.md`.

## Decisiones relacionadas

- ADR-0004: cierra su action item 5 (proveedor de object storage). El
  resto del stack no cambia; se suma `@aws-sdk/client-s3` a las
  dependencias del backend.
- ADR-0005: `DOCUMENT` vive en `dossier`. Esta ADR acota una excepción a
  "`dossier` solo lee": administra el alta de `DOCUMENT` (metadatos +
  binario), sin tocar `work_order.status` ni `status_history`.
- ADR-0009: el `StorageService` se testea con Vitest; en los tests
  unitarios se mockea con `{ provide: StorageService, useValue: ... }`
  (mismo patrón que el resto de las dependencias de NestJS).
