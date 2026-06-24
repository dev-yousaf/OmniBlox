-- Add slug, description, status to product_categories
ALTER TABLE "product_categories" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "product_categories" ADD COLUMN "description" TEXT;
ALTER TABLE "product_categories" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "product_categories" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "product_categories" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate slug from name for existing rows
UPDATE "product_categories" SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')) WHERE "slug" = '';

-- Add unique constraint on (companyId, slug)
CREATE UNIQUE INDEX "product_categories_companyId_slug_key" ON "product_categories"("companyId", "slug");

-- Create sub_categories table
CREATE TABLE "sub_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "categoryId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- Sub category indexes and constraints
CREATE UNIQUE INDEX "sub_categories_companyId_name_categoryId_key" ON "sub_categories"("companyId", "name", "categoryId");
CREATE UNIQUE INDEX "sub_categories_companyId_slug_key" ON "sub_categories"("companyId", "slug");
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate products.subCategory text -> subCategoryId FK
ALTER TABLE "products" ADD COLUMN "subCategoryId" TEXT;
ALTER TABLE "products" ADD CONSTRAINT "products_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old subCategory text column (data is migrated conceptually; existing free-text values are lost)
ALTER TABLE "products" DROP COLUMN "subCategory";
