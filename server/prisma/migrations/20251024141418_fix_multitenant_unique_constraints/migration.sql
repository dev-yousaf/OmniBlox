/*
  Warnings:

  - A unique constraint covering the columns `[companyId,email]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,referenceNumber]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,referenceNumber]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,invoiceNumber]` on the table `sales` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,referenceNumber]` on the table `sales_returns` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,referenceNumber]` on the table `stock_adjustments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,email]` on the table `suppliers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."customers_email_key";

-- DropIndex
DROP INDEX "public"."purchase_orders_referenceNumber_key";

-- DropIndex
DROP INDEX "public"."quotations_referenceNumber_key";

-- DropIndex
DROP INDEX "public"."sales_invoiceNumber_key";

-- DropIndex
DROP INDEX "public"."sales_returns_referenceNumber_key";

-- DropIndex
DROP INDEX "public"."stock_adjustments_referenceNumber_key";

-- DropIndex
DROP INDEX "public"."suppliers_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyId_email_key" ON "customers"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_companyId_referenceNumber_key" ON "purchase_orders"("companyId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_companyId_referenceNumber_key" ON "quotations"("companyId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_companyId_invoiceNumber_key" ON "sales"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_companyId_referenceNumber_key" ON "sales_returns"("companyId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_companyId_referenceNumber_key" ON "stock_adjustments"("companyId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_companyId_email_key" ON "suppliers"("companyId", "email");
