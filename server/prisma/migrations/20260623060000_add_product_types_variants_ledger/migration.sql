-- Create ProductType enum
CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'DIGITAL', 'SERVICE', 'COMBO');

-- Add new columns to products table
ALTER TABLE "products" 
  ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "hasVariants" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attributes" JSONB,
  ADD COLUMN "parentId" TEXT;

-- Add foreign key for variants self-relation
ALTER TABLE "products"
  ADD CONSTRAINT "products_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "products"("id") ON DELETE SET NULL;

-- Create stock_ledger table
CREATE TABLE "stock_ledger" (
  "id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "balance" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "productId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "userId" TEXT,

  CONSTRAINT "stock_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_ledger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_ledger_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX "stock_ledger_productId_idx" ON "stock_ledger"("productId");
CREATE INDEX "stock_ledger_productId_warehouseId_idx" ON "stock_ledger"("productId", "warehouseId");
