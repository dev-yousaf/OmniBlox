-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'SERVICE';

-- AlterTable: add fields to brands
ALTER TABLE "brands" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brands" ADD COLUMN "description" TEXT;
ALTER TABLE "brands" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "brands" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "brands" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate slug from name for existing rows
UPDATE "brands" SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')) WHERE "slug" = '';

-- Add unique constraint on (companyId, slug) for brands
CREATE UNIQUE INDEX "brands_companyId_slug_key" ON "brands"("companyId", "slug");

-- Create variant_attributes table
CREATE TABLE "variant_attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "values" JSONB,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variant_attributes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "variant_attributes_companyId_name_key" ON "variant_attributes"("companyId", "name");
CREATE UNIQUE INDEX "variant_attributes_companyId_slug_key" ON "variant_attributes"("companyId", "slug");
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create units table
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "units_companyId_name_key" ON "units"("companyId", "name");
CREATE UNIQUE INDEX "units_companyId_shortName_key" ON "units"("companyId", "shortName");
CREATE UNIQUE INDEX "units_companyId_slug_key" ON "units"("companyId", "slug");
ALTER TABLE "units" ADD CONSTRAINT "units_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create warranties table
CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "durationType" TEXT NOT NULL DEFAULT 'MONTHS',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "warranties_companyId_name_key" ON "warranties"("companyId", "name");
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
