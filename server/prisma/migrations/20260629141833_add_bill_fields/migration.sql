-- AlterTable
ALTER TABLE "billers" ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "gstNumber" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "saleId" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "billDate" TIMESTAMP(3),
ADD COLUMN     "billNumber" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
