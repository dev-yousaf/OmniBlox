-- CreateEnum
CREATE TYPE "BillerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "billerId" TEXT;

-- CreateTable
CREATE TABLE "billers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "BillerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "billers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billers_companyId_code_key" ON "billers"("companyId", "code");

-- AddForeignKey
ALTER TABLE "billers" ADD CONSTRAINT "billers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "billers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
