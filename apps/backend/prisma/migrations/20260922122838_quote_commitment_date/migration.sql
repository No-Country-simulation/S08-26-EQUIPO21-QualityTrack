-- AlterTable: agrega commitment_date como nullable, backfillea las filas
-- existentes (datos de desarrollo, sin equivalente real a inventar) y
-- recién ahí la vuelve NOT NULL -- editado a mano, ver
-- prisma/migrations/README.md.
ALTER TABLE "quote" ADD COLUMN     "commitment_date" TIMESTAMP(3);

UPDATE "quote" SET "commitment_date" = "created_at" + INTERVAL '14 days'
WHERE "commitment_date" IS NULL;

ALTER TABLE "quote" ALTER COLUMN "commitment_date" SET NOT NULL;
