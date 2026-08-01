-- AlterTable (baseline: auth_tokens.code already exists in live DB, add to migration history)
ALTER TABLE "auth_tokens" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_code_key" ON "auth_tokens"("code");

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'utc',
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'mdy',
    "timeFormat" TEXT NOT NULL DEFAULT '12',
    "currencyCode" TEXT NOT NULL DEFAULT 'usd',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "lowStockAlerts" BOOLEAN NOT NULL DEFAULT true,
    "defaultWarehouseId" TEXT,
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "backupTime" TEXT NOT NULL DEFAULT '02:00',
    "dataRetention" TEXT NOT NULL DEFAULT '1year',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_companyId_key" ON "company_settings"("companyId");

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
