/*
  Warnings:

  - Made the column `email` on table `customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "archived_at" TIMESTAMP(3),
ALTER COLUMN "email" SET NOT NULL;
