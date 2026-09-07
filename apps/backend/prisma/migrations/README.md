# Migraciones — notas

## Nunca usar `prisma db push` en este proyecto

`db push` sincroniza la base con `schema.prisma` sin pasar por las
migraciones. El índice único parcial de abajo **solo existe en el SQL de
una migración** — Prisma no lo puede representar en el schema — así que
`db push` deja la base sin esa protección y sin avisar. Usar siempre
`prisma migrate dev` (o `pnpm --filter backend prisma:migrate`).

## Índice único parcial en `work_order.quote_id` (ADR-0001 + ADR-0006)

`WORK_ORDER.quoteId` **no** lleva `@unique` en `schema.prisma` a propósito:
ADR-0006 permite que una OT de refabricación reutilice el `quote_id` de la
OT que reemplaza (cuando `replaces_work_order_id` no es nulo). Un `@unique`
liso rompería ese caso.

La regla que sí hay que garantizar —**una sola OT "original" por
cotización**— es un índice único parcial que Prisma no puede expresar en
el schema:

```sql
CREATE UNIQUE INDEX "work_order_quote_id_original_key"
  ON "work_order" ("quote_id")
  WHERE "replaces_work_order_id" IS NULL;
```

### Estado

**Ya aplicado.** Vive en la migración
`20260907124810_work_order_unique_original_quote/migration.sql`, creada
con `prisma migrate dev --create-only` y editada a mano. Verificado en la
base con `\d work_order`.

Esta nota queda como referencia para:

- Entender por qué `work_order.quote_id` no lleva `@unique` en el schema.
- Recrear el índice si alguna vez se resetea y recompone el historial de
  migraciones.

### Verificación

Un test de integración debe cubrir:

- Crear una segunda OT con el mismo `quote_id` y `replaces_work_order_id`
  nulo → la base la rechaza.
- Crear una OT con el mismo `quote_id` pero `replaces_work_order_id`
  apuntando a la OT cancelada → la base la acepta.
