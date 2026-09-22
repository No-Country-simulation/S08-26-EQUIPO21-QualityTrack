/*
  Warnings:

  - You are about to drop the column `description` on the `request` table.
    Editada a mano (igual que 20260907124810_work_order_unique_original_quote
    y 20260908093958_customer_email_required_and_archived): `piece` y
    `quantity` nacen nullable para poder backfillear desde `description`
    antes de exigir `NOT NULL`, algo que `prisma migrate dev` no genera
    solo. Ver prisma/migrations/README.md.

*/
-- AlterTable: agregar las columnas nuevas nullable primero
ALTER TABLE "request" ADD COLUMN     "piece" TEXT,
ADD COLUMN     "quantity" INTEGER;

-- Backfill: las solicitudes creadas por la UI ya escriben "<piece> · x<quantity>"
-- en description (ver composeRequestDescription, apps/frontend). Las filas
-- que no siguen ese formato (datos de semilla previos) conservan el texto
-- completo como "piece" y "quantity" default a 1 -- no hay forma de
-- recuperar una cantidad que nunca se guardó como valor propio.
UPDATE "request"
SET
  "piece" = CASE
    WHEN "description" LIKE '% · x%' THEN split_part("description", ' · x', 1)
    ELSE "description"
  END,
  "quantity" = CASE
    WHEN "description" LIKE '% · x%'
      AND split_part("description", ' · x', 2) ~ '^[0-9]+$'
    THEN split_part("description", ' · x', 2)::integer
    ELSE 1
  END;

-- Ahora que toda fila tiene valor, exigir NOT NULL y borrar la columna vieja.
ALTER TABLE "request" ALTER COLUMN "piece" SET NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL;

ALTER TABLE "request" DROP COLUMN "description";
