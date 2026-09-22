-- AlterTable: agrega las columnas de avance de OPERATION. `sequence`
-- nace nullable, se backfillea (ver abajo) y recién ahí se vuelve
-- NOT NULL -- mismo criterio que 20260922122838_quote_commitment_date,
-- ver prisma/migrations/README.md.
ALTER TABLE "operation" ADD COLUMN     "finished_at" TIMESTAMP(3),
ADD COLUMN     "finished_by_user_id" TEXT,
ADD COLUMN     "sequence" INTEGER,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "started_by_user_id" TEXT;

-- Backfill determinístico: numera las operaciones existentes de cada
-- hoja de ruta por su orden de creación. No hay un campo de orden previo
-- en la tabla, así que se usa el id como desempate estable (mismo id
-- para la misma fila en cada corrida, aunque no siga el orden real de
-- alta). En la práctica no debería haber filas reales al aplicar esta
-- migración -- ROUTE_SHEET/OPERATION recién nacen con este mismo PR --
-- pero se sigue el mismo criterio de seguridad que el resto de las
-- migraciones con backfill de este proyecto.
UPDATE "operation" o
SET "sequence" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY route_sheet_id ORDER BY id) AS rn
  FROM "operation"
) sub
WHERE o.id = sub.id;

ALTER TABLE "operation" ALTER COLUMN "sequence" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "operation" ADD CONSTRAINT "operation_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation" ADD CONSTRAINT "operation_finished_by_user_id_fkey" FOREIGN KEY ("finished_by_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
