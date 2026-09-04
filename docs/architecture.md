# Arquitectura y modelo de datos — QualityTrack

## Resumen

Este documento describe el modelo de datos relacional y las máquinas de
estados de `QUOTE` y `WORK_ORDER`. Se actualiza a medida que el equipo
de backend toma decisiones — ver `docs/adr/` para el razonamiento detrás
de cada una.

## Modelo de datos (ERD)

```mermaid
erDiagram
    CUSTOMER ||--o{ REQUEST : submits
    REQUEST ||--o| QUOTE : generates
    QUOTE ||--o| WORK_ORDER : generates
    WORK_ORDER ||--o{ ROUTE_SHEET : defines
    ROUTE_SHEET ||--o{ OPERATION : contains
    WORK_ORDER ||--o{ QUALITY_CONTROL : records
    WORK_ORDER ||--o{ DOCUMENT : attaches
    WORK_ORDER ||--o{ STATUS_HISTORY : logs
    APP_USER ||--o{ STATUS_HISTORY : performs

    CUSTOMER {
        string id PK
        string name
        string tax_id
    }
    REQUEST {
        string id PK
        string customer_id FK
        string description
        string created_at
    }
    QUOTE {
        string id PK
        string request_id FK
        string status
        float amount
    }
    WORK_ORDER {
        string id PK
        string quote_id FK
        string status
        string created_at
    }
    ROUTE_SHEET {
        string id PK
        string work_order_id FK
        int sequence
    }
    OPERATION {
        string id PK
        string route_sheet_id FK
        string type
        string status
    }
    QUALITY_CONTROL {
        string id PK
        string work_order_id FK
        string result
        boolean is_nonconforming
    }
    DOCUMENT {
        string id PK
        string work_order_id FK
        string type
        string url
    }
    STATUS_HISTORY {
        string id PK
        string work_order_id FK
        string user_id FK
        string previous_status
        string new_status
        string changed_at
    }
    APP_USER {
        string id PK
        string name
        string role
    }
```

GitHub renderiza este bloque como diagrama automáticamente al ver el
archivo en el repo — no hace falta exportar una imagen aparte.

**Nota:** la entidad de usuario se llama `APP_USER` y no `USER` porque
`USER` es palabra reservada en PostgreSQL y en el estándar SQL.
`REQUEST` no tiene `customer_id` duplicado en `QUOTE` — el cliente se
alcanza vía `request_id` (ver ADR-0003).

## Por qué STATUS_HISTORY es la tabla central

Sin un registro append-only de cada transición de estado, no es posible
reconstruir el historial completo de una OT desde una pantalla — que es el
criterio de éxito del proyecto. Ninguna transición de estado debe
sobrescribir directamente `WORK_ORDER.status` sin insertar antes una fila
acá, en la misma transacción.

## Máquinas de estados

`QUOTE` y `WORK_ORDER` tienen máquinas de estados propias e independientes.
No comparten valores: una `WORK_ORDER` solo se crea cuando la `QUOTE` ya
fue aprobada (ver ADR-0001), así que un estado `approved` en `WORK_ORDER`
sería redundante — no describiría nada propio de la OT, solo repetiría un
evento que ya quedó registrado en la cotización.

### QUOTE.status

| Valor (código)     | Descripción                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `pending_approval` | Esperando aprobación del cliente                                 |
| `approved`         | Aprobada por el cliente — dispara la creación de la `WORK_ORDER` |
| `rejected`         | Rechazada por el cliente — no genera `WORK_ORDER`                |

### WORK_ORDER.status

El flujo de negocio definido para el MVP:

Solicitud Cliente → Cotización → Aprobación → Orden de Trabajo (OT) →
Hoja de Ruta → Operaciones en Planta → Control de Calidad → Entrega

| Valor (código)       | Descripción                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `created`            | OT recién generada a partir de una cotización aprobada, todavía sin hoja de ruta |
| `routed`             | Hoja de ruta definida, lista para producción                                     |
| `in_production`      | Operaciones de planta en curso                                                   |
| `in_quality_control` | Pieza terminada, pendiente de inspección                                         |
| `delivered`          | Control de calidad conforme, ciclo cerrado                                       |
| `nonconforming`      | Control de calidad detectó una no conformidad                                    |

**Transiciones válidas:**

```
created → routed
routed → in_production
in_production → in_quality_control
in_quality_control → delivered
in_quality_control → nonconforming
nonconforming → in_production
```

`in_production` y `in_quality_control`/`nonconforming` forman un ciclo:
una OT puede pasar por control de calidad más de una vez si hay
reprocesos. Ver `docs/adr/0002-reproceso-no-conformidad.md` para el
razonamiento detrás de esta decisión.

## Endpoint del expediente único

`GET /work-orders/:id/dossier` es el endpoint más crítico del sistema:
debe devolver en una sola respuesta todo lo necesario para la pantalla
central del MVP — la solicitud y cotización de origen, datos de la OT,
`STATUS_HISTORY` completo, documentos, hoja de ruta, operaciones, y
**todos** los controles de calidad registrados (no solo el más
reciente, por los reprocesos de ADR-0002).

## Decisiones relacionadas

Ver `docs/adr/0001-cardinalidad-cotizacion-orden-trabajo.md`,
`docs/adr/0002-reproceso-no-conformidad.md` y
`docs/adr/0003-entidad-request.md`.
