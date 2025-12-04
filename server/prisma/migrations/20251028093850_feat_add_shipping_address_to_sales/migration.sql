-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RECEIVED';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "shippingAddress" TEXT;
