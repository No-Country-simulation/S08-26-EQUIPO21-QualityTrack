-- Índice único parcial: una sola WORK_ORDER "original" por cotización.
-- Ver ADR-0001 (cardinalidad QUOTE:WORK_ORDER) y ADR-0006 (excepción para
-- refabricación: replaces_work_order_id no nulo puede repetir quote_id).
-- Prisma no puede expresar índices parciales en schema.prisma.
CREATE UNIQUE INDEX "work_order_quote_id_original_key"
  ON "work_order" ("quote_id")
  WHERE "replaces_work_order_id" IS NULL;