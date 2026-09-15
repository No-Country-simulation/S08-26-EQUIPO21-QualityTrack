# ADR-0008: El email de un cliente es obligatorio

**Estado:** Aceptada
**Fecha:** 2026-09-08
**Deciders:** Team (a propuesta de QA)

## Contexto

Al modelar `CUSTOMER` para el CRUD del módulo Comercial (ADR-0005), la
entidad tenía dos campos obligatorios — `name` y `taxId` (identificador
tributario, ver ADR-0007) — y se propuso sumar tres datos de contacto
**opcionales**: `email`, `phone` y `address`.

El equipo aprobó sumar los tres. Sobre esa aprobación, QA elevó una
observación: el `email` no debería ser opcional. Los criterios de
aceptación del MVP asumen que a un cliente se lo puede contactar por
correo en varios puntos del flujo — aviso de cotización lista,
confirmación de entrega, notificación de no conformidad. Un cliente sin
`email` deja esos pasos sin canal.

`phone` y `address` siguen siendo opcionales: son datos de contacto
complementarios, no un canal que el sistema necesite garantizar.

## Decisión

`CUSTOMER.email` es **obligatorio** (`NOT NULL`).

- Todo alta de cliente exige un `email` válido (formato validado en el
  DTO con `@IsEmail()`).
- `phone` y `address` se mantienen opcionales (`String?`).

### El email NO es único

No se agrega `@@unique([email])`. El único identificador único de
`CUSTOMER` sigue siendo `taxId` (ADR-0007). Razones:

- Dos áreas de una misma empresa cliente, o un rebranding de correo,
  no deberían chocar contra un constraint.
- Un segundo campo único crearía ambigüedad sobre cuál identifica al
  cliente.
- Un `email` único traería el mismo problema que ADR-0007 evita para el
  `taxId`: qué pasa con el correo de un cliente archivado y si se puede
  "liberar". Al no ser único, no hay problema que resolver.

`email` obligatorio + no único: todo cliente tiene un correo de
contacto, pero el correo no lo identifica.

## Opciones consideradas

### Opción A: `email` opcional (propuesta original)

**Pros:** permite dar de alta un cliente con solo `name` y `taxId`,
cuando Comercial todavía no tiene el correo.
**Cons:** los pasos del flujo que notifican al cliente por correo quedan
sin canal garantizado; hay que manejar en todos lados el caso "cliente
sin email". QA lo marcó como riesgo para los criterios de aceptación.

### Opción B: `email` obligatorio, no único — elegida

**Pros:** garantiza un canal de contacto para cada cliente; los pasos de
notificación pueden asumir que el `email` está. No agrega un segundo
identificador único ni el problema de "liberar" un correo al archivar.
**Cons:** no se puede registrar un cliente hasta tener su correo. Es una
fricción aceptable: `name` + `taxId` + `email` es un mínimo razonable
para un cliente B2B.

### Opción C: `email` obligatorio y único

**Descartada.** El beneficio (evitar clientes duplicados) ya lo cubre el
`@@unique([taxId])`. La unicidad de `email` agrega los problemas
descritos arriba sin resolver nada que `taxId` no resuelva.

## Consecuencias

- `prisma/schema.prisma`: `CUSTOMER.email` pasa de `String?` a `String`.
  `phone` y `address` quedan `String?`.
- Una migración altera la columna a `NOT NULL`. **Atención al orden**: si
  ya hay filas `customer` con `email` nulo en algún entorno, la
  migración falla — hay que backfillear o limpiar esas filas primero. En
  desarrollo local, la migración `20260907122801_init` +
  `20260908080830_customer_contact_fields` todavía no tienen datos
  productivos, así que el `ALTER` corre limpio.
- `create-customer.dto.ts`: `email` deja de llevar `@IsOptional()`; pasa
  a `@IsEmail()` + `@IsNotEmpty()`. `phone` y `address` siguen
  `@IsOptional()`.
- `docs/architecture.md`: el bloque `CUSTOMER { ... }` del ERD marca
  `email` sin `"nullable"`; `phone` y `address` siguen `"nullable"`.
- El `email` **no** lleva `@@unique`. `customers.repository.ts` no gana
  un `findByEmail` para validación de unicidad (sí podría tenerlo para
  búsqueda, pero no es una restricción).

## Action Items

1. [ ] `prisma/schema.prisma`: `email String` (sin `?`) en `Customer`.
       Generar la migración `ALTER TABLE customer ALTER COLUMN email SET
    NOT NULL`.
2. [ ] `create-customer.dto.ts`: quitar `@IsOptional()` de `email`,
       dejar `@IsEmail()` + `@IsNotEmpty()`.
3. [ ] Actualizar el ERD de `docs/architecture.md`: `email` deja de ser
       `"nullable"`.
4. [ ] Confirmar con QA que "obligatorio, no único" cubre lo que sus
       criterios de aceptación esperan del canal de contacto.

## Decisiones relacionadas

- ADR-0004: fija el stack (Prisma) y `onDelete: Restrict`.
- ADR-0007: `taxId` es el único identificador único de `CUSTOMER`; un
  cliente no se borra, se archiva. Esta ADR no toca el `taxId` ni el
  archivado — solo la obligatoriedad de `email`.
