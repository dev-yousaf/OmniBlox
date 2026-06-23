-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stock_ledger" DROP CONSTRAINT "stock_ledger_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stock_ledger" DROP CONSTRAINT "stock_ledger_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stock_ledger" DROP CONSTRAINT "stock_ledger_warehouseId_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'pcs';

-- CreateTable
CREATE TABLE "combo_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "combo_items_comboId_productId_key" ON "combo_items"("comboId", "productId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
