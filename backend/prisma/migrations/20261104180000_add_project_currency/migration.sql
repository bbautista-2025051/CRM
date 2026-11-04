CREATE TYPE "ProjectCurrency" AS ENUM ('GTQ', 'USD');
ALTER TABLE "projects" ADD COLUMN "currency" "ProjectCurrency" NOT NULL DEFAULT 'GTQ';
