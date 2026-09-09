# Estructura de carpetas del backend

Guía de referencia para organizar el código de `apps/backend` según la
decisión de la [ADR-0005](adr/0005-organizacion-por-dominios.md)
(módulos de feature de NestJS) sobre el stack de la
[ADR-0004](adr/0004-stack-tecnologico.md) (NestJS + Prisma).

Es documentación viva: la ADR-0005 fija los módulos y las reglas de
invariancia; este documento propone cómo se traducen a carpetas y se
ajusta a medida que el backend crece.

## Reglas que la estructura tiene que respetar

Vienen de la ADR-0005, `docs/architecture.md` y `CLAUDE.md` — no son
negociables:

1. El código se agrupa por **módulo de feature** (área de negocio), no
   por capa técnica. No hay un `src/controllers/`, `src/services/`,
   `src/repositories/` a nivel raíz.
2. `STATUS_HISTORY` y `work_order.status` se escriben **únicamente**
   desde el módulo `status-history`, a través de su método
   `transition()`. Ningún otro módulo importa el acceso Prisma a esas
   dos tablas.
3. La escritura en `STATUS_HISTORY` ocurre en la **misma transacción**
   que el cambio de `WORK_ORDER.status` — dentro de `transition()`, con
   un solo `prisma.$transaction` (regla de `CLAUDE.md`).
4. La máquina de estados de `WORK_ORDER` (transiciones legales + límite
   de 3 reprocesos de ADR-0002) vive en `status-history`, junto a la
   escritura que protege.
5. `quality` no tiene estado propio: registra la inspección y, si es no
   conforme, llama a `transition()` para mover el `WORK_ORDER` (ADR-0002).
6. `GET /work-orders/:id/dossier` se resuelve en el módulo `dossier` en
   una sola respuesta (regla de `CLAUDE.md`). `dossier` compone el
   expediente (lectura) y además administra el alta de `DOCUMENT`
   (metadatos + subida del binario al object storage, ADR-0010) — una
   escritura acotada a esa entidad. No toca `work_order.status` ni
   `status_history`.

## Estructura de referencia

Cada módulo es un módulo de NestJS estándar: `*.module.ts`,
`*.controller.ts`, `*.service.ts` y el acceso a datos. Sin capas
`domain/` · `application/` · `infrastructure/` obligatorias — se
introduce una subcarpeta solo cuando un módulo concreto la necesite.

```
apps/backend/
├── prisma/
│   ├── schema.prisma            # ERD completo — fuente de verdad (ADR-0004)
│   └── migrations/
├── src/
│   ├── main.ts                  # bootstrap + enableShutdownHooks() (cierre limpio del pool)
│   ├── app.module.ts            # ConfigModule.forRoot (global) + PrismaModule + módulos de feature
│   │
│   ├── config/
│   │   └── env.validation.ts    # valida DATABASE_URL / PORT / NODE_ENV / STORAGE_* al arrancar (fail-fast)
│   │
│   ├── prisma/                  # infraestructura — sin lógica de negocio
│   │   ├── prisma.module.ts     # @Global — provee y exporta PrismaService
│   │   └── prisma.service.ts    # onModuleInit: $connect · onModuleDestroy: $disconnect
│   │
│   ├── storage/                 # infraestructura — object storage S3-compatible (ADR-0010)
│   │   ├── storage.module.ts    # @Global — provee y exporta StorageService
│   │   └── storage.service.ts   # wrapper de @aws-sdk/client-s3: putObject, getSignedDownloadUrl, deleteObject
│   │
│   ├── modules/
│   │   ├── quotes/                      # Comercial — CUSTOMER, REQUEST, QUOTE (un módulo, ADR-0005)
│   │   │   ├── quotes.module.ts
│   │   │   ├── customers.{controller,service,repository}.ts   # CRUD de CUSTOMER + archivar/reactivar (ADR-0007)
│   │   │   ├── requests.{controller,service,repository}.ts    # alta/consulta de REQUEST; guard de cliente archivado (ADR-0003)
│   │   │   ├── quotes.{controller,service}.ts                 # cotización y aprobación — se registran cuando tengan lógica real
│   │   │   ├── dto/                     # create-customer, update-customer, create-request
│   │   │   └── entities/                # customer.entity, request.entity (+ request-with-customer para AC3)
│   │   │
│   │   ├── work-orders/                 # Producción — WORK_ORDER, ROUTE_SHEET, OPERATION
│   │   │   ├── work-orders.module.ts
│   │   │   ├── work-orders.controller.ts
│   │   │   ├── work-orders.service.ts   # crear OT, hoja de ruta, operaciones;
│   │   │   │                            #   las transiciones delegan en StatusHistoryService
│   │   │   ├── work-orders.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── quality/                     # Calidad — QUALITY_CONTROL
│   │   │   ├── quality.module.ts
│   │   │   ├── quality.controller.ts    # registrar inspección
│   │   │   ├── quality.service.ts       # si no conforme → transition(id, markNonconforming)
│   │   │   ├── quality.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── status-history/              # Trazabilidad (escritura) — STATUS_HISTORY
│   │   │   ├── status-history.module.ts
│   │   │   ├── status-history.service.ts  # ÚNICO escritor de work_order.status y status_history
│   │   │   │                              #   expone transition(workOrderId, event, userId)
│   │   │   ├── status-history.repository.ts
│   │   │   ├── work-order-state-machine.ts # transiciones legales + límite de 3 reprocesos (ADR-0002)
│   │   │   └── work-order-event.ts         # enum de eventos: route, sendToQC, markNonconforming, ...
│   │   │
│   │   ├── dossier/                     # Trazabilidad — expediente (lectura) + alta de DOCUMENT
│   │   │   ├── dossier.module.ts
│   │   │   ├── dossier.controller.ts    # GET /work-orders/:id/dossier
│   │   │   ├── dossier.service.ts       # compone la respuesta única; solo lee
│   │   │   ├── documents.controller.ts  # POST alta · GET listado · GET /documents/:id/download (redirect a presigned URL)
│   │   │   ├── documents.service.ts     # metadatos (Prisma) + binario (StorageService); guarda la object key en Document.url
│   │   │   └── dto/                      # upload DTO: límite de tamaño, whitelist de content-type
│   │   │
│   │   └── users/                       # Identidad — APP_USER
│   │       ├── users.module.ts
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       ├── users.repository.ts
│   │       └── auth/                    # guards, estrategia de auth, decoradores de rol
│   │
│   └── common/                         # utilidades transversales — sin negocio
│       ├── pipes/
│       ├── filters/
│       └── decorators/
│
└── test/
    ├── quotes/
    ├── work-orders/
    ├── quality/
    ├── status-history/
    │   └── transition.transaction.spec.ts   # verifica update + insert en la misma tx
    └── e2e/
        └── dossier.e2e-spec.ts
```

## Colaboración entre módulos

No hay event bus. Los módulos colaboran por **inyección de dependencias
y llamada de método directa**:

| Necesidad                                                       | Cómo se resuelve                                                                                                                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quotes` aprueba una cotización → hay que crear la `WORK_ORDER` | `QuotesService` inyecta `WorkOrdersService` y llama `createFromQuote(quoteId)`.                                                                                                                                             |
| `work-orders` / `quality` cambian el estado de una OT           | Inyectan `StatusHistoryService` y llaman `transition(workOrderId, event, userId)`. Nunca tocan `status` a mano.                                                                                                             |
| `quality` marca una inspección no conforme                      | `QualityService` registra el `QUALITY_CONTROL` y llama `transition(id, WorkOrderEvent.MarkNonconforming, userId)`.                                                                                                          |
| `dossier` arma el expediente                                    | `DossierService` inyecta los repositorios/servicios de lectura de `quotes`, `work-orders`, `quality` y `status-history` y compone la respuesta. No escribe estado.                                                          |
| `dossier` da de alta un documento de una OT                     | `DocumentsService` sube el binario con `StorageService` (`@aws-sdk/client-s3`) y persiste la fila `DOCUMENT` con la object key. Escritura acotada a `DOCUMENT`; no toca `work_order.status` ni `status_history` (ADR-0010). |

Para evitar dependencias circulares entre `quotes` ↔ `work-orders` o
`work-orders` ↔ `status-history`, cada módulo exporta solo el service
que otros necesitan (`exports: [XService]` en su `@Module`), y si hace
falta se usa `forwardRef()` puntualmente.

## Cómo se cumplen las reglas

| Regla                                                   | Dónde se implementa                                                                                                                                                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agrupar por módulo de feature                           | `src/modules/<módulo>/`, sin capas técnicas en la raíz                                                                                                                                                           |
| `STATUS_HISTORY` y `status` solo desde `status-history` | Único módulo que importa `status-history.repository.ts`. Su service expone solo `transition()`. Revisión de PR bloquea cualquier otro acceso a esas tablas.                                                      |
| Transición + `STATUS_HISTORY` en la misma transacción   | `StatusHistoryService.transition()` abre un `prisma.$transaction([updateStatus, insertHistory])`; ante error, rollback conjunto. Cubierto por `test/status-history/transition.transaction.spec.ts`.              |
| Máquina de estados                                      | `status-history/work-order-state-machine.ts` — mapa de `(status actual, event) → status siguiente`, más la validación de que no haya 3 filas `nonconforming` previas en `STATUS_HISTORY` para esa OT (ADR-0002). |
| `quality` sin estado propio                             | `quality/` no tiene repositorio de `WORK_ORDER`; para transicionar llama `transition()`.                                                                                                                         |
| `dossier` en una sola respuesta                         | `dossier/dossier.service.ts` arma request + quote + OT + `STATUS_HISTORY` + documentos + hoja de ruta + operaciones + todos los `QUALITY_CONTROL` en un método.                                                  |
| `users` sin lógica de negocio de dominio                | Solo autenticación/autorización y lectura de `APP_USER`; los demás módulos lo consultan, no al revés.                                                                                                            |

## Nomenclatura

Coherente con `CLAUDE.md` (identificadores en inglés, documentación en
español):

- Carpetas de módulo: en inglés y en plural cuando nombran una colección
  de recursos (`quotes`, `work-orders`, `quality`, `status-history`,
  `dossier`, `users`).
- En la documentación y las conversaciones se usan los nombres de
  negocio en español (Comercial, Producción, Calidad, Trazabilidad,
  Identidad).
- Archivos: `kebab-case` con sufijo de rol NestJS (`.module.ts`,
  `.controller.ts`, `.service.ts`, `.repository.ts`, `.dto.ts`,
  `.guard.ts`, `.pipe.ts`).
- El enum de eventos de transición (`WorkOrderEvent.Route`,
  `WorkOrderEvent.MarkNonconforming`, ...) nombra la transición canónica
  de `WORK_ORDER.status` definida en `docs/architecture.md` y ADR-0002.
