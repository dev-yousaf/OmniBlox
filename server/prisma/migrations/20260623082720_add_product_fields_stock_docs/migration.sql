-- AlterTable
ALTER TABLE "products" ADD COLUMN     "alertQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "barcodeSymbology" TEXT NOT NULL DEFAULT 'CODE128',
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stock_adjustments" ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'ADDITION';
