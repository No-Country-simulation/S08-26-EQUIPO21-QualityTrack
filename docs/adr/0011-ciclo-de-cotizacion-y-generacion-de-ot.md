# ADR-0011: Ciclo de la cotización, sin STATUS_HISTORY, y generación de la OT al aprobar

**Estado:** Aceptada
**Fecha:** 2026-09-09
**Deciders:** Backend (a partir de la issue #27, revisado con QA)

## Contexto

La issue #27 ("CRUD de Cotizaciones y panel comercial") trae dos
criterios de aceptación que chocan entre sí y con el modelo ya
decidido:

1. **"Cada aprobación/rechazo genera un registro en `STATUS_HISTORY`."**
   Pero `STATUS_HISTORY` es exclusivo de `WORK_ORDER`:
   `status_history.work_order_id` es NOT NULL, `previous_status` /
   `new_status` son el enum `WorkOrderStatus`, y ADR-0005 fija que el
   **único** módulo que escribe esa tabla es `status-history`, a través
   de `transition()`, para transiciones de la OT. El propio
   `schema.prisma` lo dice: _"la cotización no es la entidad trazable, la
   OT sí"_ — `QUOTE` lleva `updatedAt`, no una tabla de historial.
   Además, en el momento de aprobar/rechazar todavía no hay una
   `WORK_ORDER` a la cual asociar la fila.

2. **La generación de la OT** ("solo una cotización aprobada puede
   generar una OT", Épica 3) quedaba repartida entre #27 y la issue #28,
   sin definir quién crea la `WORK_ORDER` ni en qué momento.

## Decisión

### La cotización no escribe `STATUS_HISTORY`

El cambio de estado de una `QUOTE` (`pending_approval → approved` /
`rejected`) se registra en `quote.status` + `quote.updatedAt`, y nada
más. No hay tabla de historial de cotizaciones ni filas en
`STATUS_HISTORY`.

- `approve` y `reject` solo son válidos desde `pending_approval`. Desde
  `approved` o `rejected` (ambos terminales) se rechazan con `409`.
- La trazabilidad _append-only_ del sistema arranca en la OT. El primer
  eslabón visible del recorrido de un trabajo es la `WORK_ORDER` en
  estado `created`; la solicitud y la cotización de origen se muestran
  en el expediente porque `dossier` las resuelve por FK (ADR-0005), no
  porque tengan historial propio.
- **Enmienda a la issue #27:** el criterio "cada aprobación/rechazo
  genera un registro en `STATUS_HISTORY`" se reemplaza por "cada
  aprobación/rechazo actualiza `quote.status` y queda fechado en
  `quote.updatedAt`". Revisado con QA: los criterios de la Épica 2
  ("el sistema registra el estado actual de la cotización") se cumplen
  igual.

### Aprobar una cotización genera la OT, en la misma transacción

`PATCH /quotes/:id/approve` mueve la cotización a `approved` **y** crea
la `WORK_ORDER` original (estado `created`) dentro de un único
`prisma.$transaction`. Si la creación de la OT falla, la aprobación se
revierte: nunca queda una cotización `approved` sin su OT.

- `QuotesService.approve()` abre la transacción, actualiza el estado y
  llama a `WorkOrdersService.createFromApprovedQuote(quoteId, tx)`
  (colaboración por inyección de dependencias, ADR-0005 —
  `quotes` importa `WorkOrdersModule`).
- `PATCH /quotes/:id/reject` no crea nada: solo mueve el estado.
- **"Una misma cotización no genera OTs duplicadas":** lo garantiza el
  índice único parcial `work_order_quote_id_original_key`
  (`work_order (quote_id) WHERE replaces_work_order_id IS NULL`, ADR-0001
  / ADR-0006). El service hace un pre-check para el mensaje temprano; el
  repositorio traduce el `P2002` a `409` como red ante dos aprobaciones
  concurrentes.

### La creación de la OT no escribe `STATUS_HISTORY`

El estado inicial `created` es el **génesis** de la OT, no una
transición: `status_history.previous_status` es NOT NULL y no hay forma
de representar "sin estado previo". El historial de la OT arranca en su
primera transición real (`created → routed`, issue #31 vía
`status-history`). Crear la `WORK_ORDER` es, por eso, un `INSERT` simple
en `work-orders`, fuera del alcance de `status-history`.

### Reparto con la issue #28

- **#27 (esta issue)** implementa: `POST /quotes`,
  `PATCH /quotes/:id/approve`, `PATCH /quotes/:id/reject`,
  `GET /quotes/:id`, `GET /quotes/commercial-panel`, y el alta de la OT
  al aprobar (`WorkOrdersService.createFromApprovedQuote` +
  `GET /work-orders/:id` básico).
- **#28** queda para la consulta y el listado de OT más ricos, la
  búsqueda, y lo que la Épica 3 pida además del alta.

## Opciones consideradas

### Sobre el historial de la cotización

| Opción                                                              | Evaluación                                                                                                                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. `quote.status` + `updatedAt`, sin `STATUS_HISTORY` — elegida** | Consistente con el `schema.prisma` y ADR-0005; cero esquema nuevo; la cola de Comercial se arma filtrando por `status`.                                                                                                            |
| B. Escribir en `STATUS_HISTORY` al aprobar/rechazar                 | Imposible sin romper el modelo: `work_order_id` NOT NULL y enums `WorkOrderStatus`. Obligaría a hacer `work_order_id` nullable y mezclar dos máquinas de estado en una tabla — degrada la tabla que sostiene el criterio de éxito. |
| C. Tabla `quote_status_history` propia                              | Contradice el comentario del schema; agrega esquema y una migración para un caso (2 transiciones terminales) que `updatedAt` ya cubre.                                                                                             |

### Sobre cuándo se crea la OT

| Opción                                                                    | Evaluación                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Al aprobar, en la transacción de la aprobación — elegida**           | "Cotización aprobada ⇒ OT" es una invariante; hacerlo atómico evita el estado intermedio inconsistente. Un solo lugar (`approve`) por donde nace una OT original.                                                               |
| B. Endpoint separado `POST /work-orders` que recibe un `quoteId` aprobado | Deja una ventana en la que una cotización está `approved` sin OT; multiplica los caminos de creación y las validaciones ("¿está aprobada?"). Se puede sumar después para casos de re-disparo manual, sin cambiar esta decisión. |

## Consecuencias

- **Sin migración.** `QUOTE` y `WORK_ORDER` ya están completos en
  `schema.prisma`; el índice único parcial ya existe
  (`20260907124810_work_order_unique_original_quote`).
- `quotes` gana `quotes.{controller,service,repository}.ts`, DTO
  `create-quote`, entities `quote` / `quote-with-relations` /
  `approved-quote` / `commercial-panel`, e importa `WorkOrdersModule`.
- `work-orders` deja de ser un módulo vacío: `WorkOrdersService`
  (`createFromApprovedQuote`, `findOne`), `WorkOrdersRepository`
  (`createOriginal` con traducción de `P2002`, `findById`,
  `findOriginalByQuoteId`), controller con `GET /work-orders/:id`, y
  `WorkOrderEntity`. Exporta `WorkOrdersService`.
- Los repos de `quotes` y `work-orders` aceptan un
  `Prisma.TransactionClient` opcional en los métodos que participan de
  la transacción de aprobación.
- `docs/backend-structure.md` se actualiza (contenido real de `quotes`,
  `work-orders`, y la fila de colaboración `quotes → work-orders`).
- `docs/acceptance-criteria.md` (Épica 2): el registro del estado de la
  cotización se entiende como `status` + `updatedAt`.
- **Pendiente / no incluido:** autorización por rol (issue #35 — hoy los
  endpoints van sin guard, como el resto de la API); listado y búsqueda
  de OT (issue #28); `status-history` y las transiciones de la OT
  (issues #31, #34).

## Decisiones relacionadas

- **ADR-0001 / ADR-0006:** la OT que nace acá es la "original"
  (`replaces_work_order_id` nulo); el índice único parcial impide una
  segunda original por cotización.
- **ADR-0005:** `quotes` y `work-orders` colaboran por inyección de
  dependencias; `STATUS_HISTORY` y `work_order.status` siguen siendo
  territorio exclusivo de `status-history` — esta ADR no lo toca, porque
  el alta de la OT en `created` no es una transición.
- **ADR-0003:** la cotización se vincula al cliente vía la solicitud, no
  repite `customer_id`; el panel comercial reutiliza el filtro
  `pendingQuote` de `requests`.
