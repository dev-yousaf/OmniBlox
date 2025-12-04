-- DropForeignKey
ALTER TABLE "public"."companies" DROP CONSTRAINT "companies_ownerId_fkey";

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
