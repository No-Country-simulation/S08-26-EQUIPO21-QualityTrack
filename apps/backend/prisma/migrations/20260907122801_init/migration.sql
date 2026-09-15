-- CreateEnum
CREATE TYPE "quote_status" AS ENUM ('pending_approval', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "work_order_status" AS ENUM ('created', 'routed', 'in_production', 'in_quality_control', 'delivered', 'nonconforming', 'cancelled');

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "quote_status" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "status" "work_order_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replaces_work_order_id" TEXT,

    CONSTRAINT "work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_sheet" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "route_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation" (
    "id" TEXT NOT NULL,
    "route_sheet_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_control" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "is_nonconforming" BOOLEAN NOT NULL,
    "inspected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "previous_status" "work_order_status" NOT NULL,
    "new_status" "work_order_status" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_tax_id_key" ON "customer"("tax_id");

-- CreateIndex
CREATE INDEX "request_customer_id_idx" ON "request"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_request_id_key" ON "quote"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_replaces_work_order_id_key" ON "work_order"("replaces_work_order_id");

-- CreateIndex
CREATE INDEX "work_order_quote_id_idx" ON "work_order"("quote_id");

-- CreateIndex
CREATE INDEX "route_sheet_work_order_id_idx" ON "route_sheet"("work_order_id");

-- CreateIndex
CREATE INDEX "operation_route_sheet_id_idx" ON "operation"("route_sheet_id");

-- CreateIndex
CREATE INDEX "quality_control_work_order_id_idx" ON "quality_control"("work_order_id");

-- CreateIndex
CREATE INDEX "document_work_order_id_idx" ON "document"("work_order_id");

-- CreateIndex
CREATE INDEX "status_history_work_order_id_changed_at_idx" ON "status_history"("work_order_id", "changed_at");

-- CreateIndex
CREATE INDEX "status_history_work_order_id_new_status_idx" ON "status_history"("work_order_id", "new_status");

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_replaces_work_order_id_fkey" FOREIGN KEY ("replaces_work_order_id") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_sheet" ADD CONSTRAINT "route_sheet_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation" ADD CONSTRAINT "operation_route_sheet_id_fkey" FOREIGN KEY ("route_sheet_id") REFERENCES "route_sheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_control" ADD CONSTRAINT "quality_control_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
