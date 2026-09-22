/*
  Warnings:

  - Added the required column `sequence` to the `operation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "operation" ADD COLUMN     "finished_at" TIMESTAMP(3),
ADD COLUMN     "finished_by_user_id" TEXT,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "started_by_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "operation" ADD CONSTRAINT "operation_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation" ADD CONSTRAINT "operation_finished_by_user_id_fkey" FOREIGN KEY ("finished_by_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
