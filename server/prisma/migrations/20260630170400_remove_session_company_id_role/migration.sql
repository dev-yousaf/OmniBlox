-- Drop multi-tenant fields from sessions table
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "companyId";
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "role";
