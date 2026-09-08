# ADR-0007: Un cliente no se borra, se archiva

**Estado:** Aceptada
**Fecha:** 2026-09-08
**Deciders:** Team

## Contexto

Al implementar el CRUD de `CUSTOMER` (módulo Comercial, ADR-0005)
apareció la necesidad de sacar de circulación a un cliente: uno que dejó
de operar con la fábrica, un contrato terminado, un alta duplicada. La
pantalla con la que Comercial carga una solicitud nueva lista todos los
clientes, y esa lista crece indefinidamente con registros que ya no se
usan.

La primera idea fue un `DELETE`. Choca de frente con una invariante que
el modelo sostiene en todos lados:

- Todas las relaciones son `onDelete: Restrict` (ADR-0004, action item 1).
- `STATUS_HISTORY` es append-only (ver `docs/architecture.md`).
- El comentario del `schema.prisma` lo dice literal: _"en este dominio
  nada se borra de verdad"_.

Un cliente con historial (`REQUEST` → `QUOTE` → `WORK_ORDER`) no puede
desaparecer sin romper el criterio de éxito del proyecto: el expediente
único de una OT vieja tiene que seguir mostrando quién la pidió, para
siempre.

La segunda idea fue un soft-delete (`deletedAt`). Funciona técnicamente,
pero el encuadre es equivocado: "cliente eliminado" sugiere que algo se
perdió, obliga a razonar sobre si se puede "borrar" un cliente con
trabajos hechos, y arrastra un problema de unicidad del `taxId` (¿el
`@@unique` aplica a los borrados?).

El caso de negocio real no es "borré algo", es "este cliente ya no está
activo". Eso es un **estado del ciclo de vida del cliente**, no una
eliminación — consistente con que `QUOTE` y `WORK_ORDER` ya tienen
máquinas de estado propias.

## Decisión

`CUSTOMER` no se borra nunca. Se **archiva**.

Se agrega la columna `archivedAt` (`DateTime?`, nullable) a `CUSTOMER`:

- `archivedAt IS NULL` → cliente **activo**.
- `archivedAt` con fecha → cliente **archivado** (y la fecha en que se
  archivó).

No hay `DELETE` físico ni columna `deletedAt`. No hay endpoint que borre
un `CUSTOMER`.

### Reglas

1. **Se puede archivar cualquier cliente**, tenga o no historial. Archivar
   un cliente con OT pasadas es el caso de uso principal, no una
   excepción.

2. **Un cliente archivado no aparece en los listados por defecto.**
   `GET /customers` devuelve solo los activos. Para verlos se pasa un
   parámetro explícito (`?includeArchived=true` o equivalente).

3. **A un cliente archivado no se le pueden crear `REQUEST` nuevas.** El
   intento se rechaza con `409 Conflict`. Archivar es, en la práctica,
   "este cliente ya no genera trabajo nuevo".

4. **El historial de un cliente archivado queda intacto y consultable.**
   Sus `REQUEST`, `QUOTE` y `WORK_ORDER` no se tocan. El endpoint
   `GET /work-orders/:id/dossier` (ADR-0005) no filtra por `archivedAt`:
   el expediente de una OT muestra a su cliente aunque esté archivado.

5. **`GET /customers/:id` devuelve el cliente aunque esté archivado**,
   con el campo `archivedAt` visible. Las pantallas de detalle y el
   dossier lo necesitan; ocultarlo ahí rompería la trazabilidad.

6. **El `taxId` sigue siendo único sin excepción.** Un cliente archivado
   conserva su `taxId`. Si ese cliente vuelve a operar, se
   **desarchiva** (`archivedAt` vuelve a `NULL`) — no se crea un
   `CUSTOMER` nuevo. Esto evita el índice único parcial que un
   soft-delete habría necesitado (a diferencia de ADR-0006, donde el
   índice parcial sobre `work_order` sí es inevitable).

7. **Un alta cargada por error se corrige o se archiva.** No hay un
   mecanismo de borrado "de verdad" ni para ese caso. Si el registro
   erróneo molesta en reportes, se archiva.

### Endpoints

| Verbo  | Ruta                       | Efecto                                                                                                        |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `POST` | `/customers/:id/archive`   | Setea `archivedAt = now()`. Idempotente: sobre un cliente ya archivado no falla, no cambia la fecha original. |
| `POST` | `/customers/:id/unarchive` | Setea `archivedAt = NULL`. Idempotente sobre un cliente activo.                                               |

No hay `DELETE /customers/:id`.

## Opciones consideradas

### Opción A: `DELETE` físico

| Dimensión                     | Evaluación                                            |
| ----------------------------- | ----------------------------------------------------- |
| Coherencia con el modelo      | Nula — contradice `onDelete: Restrict` en todo el ERD |
| Trazabilidad de OT históricas | Se rompe: un cliente borrado deja OT huérfanas        |

**Descartada.** Rompe el criterio de éxito del proyecto.

### Opción B: Soft-delete (`deletedAt`)

**Pros:** patrón conocido; el `DELETE` del CRUD "funciona" sin perder
datos.
**Cons:**

- Encuadre equivocado: "eliminado" sugiere pérdida; obliga a decidir si
  un cliente con historial "se puede borrar".
- El `@@unique([taxId])` necesita volverse índice único parcial
  (`WHERE deleted_at IS NULL`) para poder recrear un cliente borrado —
  complejidad que el caso real no pide, porque un cliente que vuelve se
  reactiva, no se recrea.
- Es una excepción a "en este dominio nada se borra de verdad" en vez de
  encajar con las máquinas de estado que el modelo ya tiene.

### Opción C: Estado "archivado" (`archivedAt`) — elegida

**Pros:**

- No es un borrado: es un estado del ciclo de vida del cliente,
  consistente con `QUOTE.status` y `WORK_ORDER.status`.
- Se archiva con o sin historial, sin reglas especiales.
- "Desarchivar" es una operación normal, no una recuperación de
  desastre.
- El `taxId` sigue siendo único liso, sin índice parcial.
- El mensaje al usuario es honesto: el cliente sigue ahí, fuera de
  circulación.

**Cons:**

- Todas las queries de **listado** del repositorio tienen que filtrar
  `archivedAt IS NULL` por defecto — fácil de olvidar en una query nueva.
  Se centraliza en `customers.repository.ts`: los métodos de listado
  aplican el filtro salvo que reciban explícitamente `includeArchived`.
- Agrega un parámetro (`includeArchived`) a la API de listado de
  clientes.

### Opción D: Ciclo de vida más rico (prospecto / activo / inactivo / archivado)

**Descartada para el MVP.** No hay un caso de negocio relevado que
distinga "inactivo" de "archivado", ni "prospecto" de "activo". Si
aparece, se amplía: `archivedAt` no bloquea evolucionar a un enum de
estado más adelante.

## Consecuencias

- `CUSTOMER` suma la columna `archivedAt` (`DateTime?`, nullable). Una
  migración la agrega; al ser nullable, todos los clientes existentes
  quedan activos.
- `docs/architecture.md`: el bloque `CUSTOMER { ... }` del ERD suma
  `archivedAt`.
- `customers.repository.ts` centraliza el filtro `archivedAt IS NULL` en
  los métodos de listado. `findById` / `findByTaxId` **no** filtran —
  devuelven el cliente aunque esté archivado (los necesita el dossier y
  la validación de `taxId` único).
- `customers.service.ts` valida, al crear una `REQUEST`, que el cliente
  no esté archivado (rechazo con `409`). Esta validación vive donde se
  crea la `REQUEST`, no en el alta de cliente.
- El CRUD de `CUSTOMER` **no expone `DELETE`**. Expone `archive` y
  `unarchive`.
- `GET /work-orders/:id/dossier` no cambia: nunca filtra por
  `archivedAt`.
- El `@@unique([taxId])` de `CUSTOMER` se mantiene tal cual, sin índice
  parcial.

## Cómo se cumplen las reglas

| Regla                                              | Dónde se implementa                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Un cliente nunca se borra                          | No hay `DELETE` en `customers.controller.ts`; no hay `prisma.customer.delete()` en el repositorio. |
| Un cliente archivado no aparece en listados        | `customers.repository.ts` filtra `archivedAt IS NULL` en `findMany` salvo `includeArchived`.       |
| No se crean `REQUEST` para un cliente archivado    | Validación en `customers.service.ts` (o donde se implemente el alta de `REQUEST`), rechazo `409`.  |
| El historial de un cliente archivado queda intacto | `archive` solo setea `archivedAt`; ninguna cascada. `dossier` no filtra por `archivedAt`.          |
| El `taxId` de un cliente archivado no se libera    | `@@unique([taxId])` liso; un cliente que vuelve se desarchiva, no se recrea.                       |

## Action Items

1. [ ] Agregar `CUSTOMER.archivedAt` (`DateTime?`) a `prisma/schema.prisma`
       y generar la migración.
2. [ ] Reflejar `archivedAt` en el ERD de `docs/architecture.md`.
3. [ ] `customers.repository.ts`: filtro `archivedAt IS NULL` en los
       métodos de listado, con opción `includeArchived`. `findById` /
       `findByTaxId` sin filtro.
4. [ ] `customers.controller.ts`: endpoints `POST /customers/:id/archive`
       y `POST /customers/:id/unarchive`, idempotentes. Sin `DELETE`.
5. [ ] Al implementar el alta de `REQUEST`: rechazar con `409` si el
       `CUSTOMER` está archivado.
6. [ ] Confirmar con Comercial que activo/archivado alcanza para el MVP y
       que no hace falta distinguir "inactivo" de "archivado".

## Decisiones relacionadas

- ADR-0004: fija `onDelete: Restrict` en todo el modelo — esta ADR es
  coherente con esa línea, no una excepción.
- ADR-0005: `CUSTOMER` vive en el módulo `quotes` (Comercial); el
  `dossier` solo lee y no filtra por `archivedAt`.
- ADR-0006: usó un índice único parcial sobre `work_order` porque ahí es
  inevitable; esta ADR lo evita para `CUSTOMER` archivando en vez de
  borrando.
