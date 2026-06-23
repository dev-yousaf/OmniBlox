-- AlterTable
ALTER TABLE "products" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "itemCode" TEXT,
ADD COLUMN     "manufacturedDate" TIMESTAMP(3),
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "warranty" TEXT;
