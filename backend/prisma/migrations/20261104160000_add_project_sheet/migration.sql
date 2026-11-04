-- Ficha comercial del proyecto: número correlativo, monto, preventa, solución
-- e historial de comentarios.

ALTER TABLE "projects" ADD COLUMN "number" INTEGER;
UPDATE "projects"
SET "number" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at", "id") AS rn
  FROM "projects"
) sub
WHERE "projects"."id" = sub."id";
CREATE UNIQUE INDEX "projects_number_key" ON "projects"("number");

ALTER TABLE "projects" ADD COLUMN "amount" DECIMAL(14,2);
ALTER TABLE "projects" ADD COLUMN "pre_sales" VARCHAR(160);
ALTER TABLE "projects" ADD COLUMN "solution" TEXT;

-- ---------------------------------------------------------------------------

CREATE TABLE "project_comments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_comments_project_id_created_at_idx"
  ON "project_comments"("project_id", "created_at");

ALTER TABLE "project_comments"
  ADD CONSTRAINT "project_comments_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_comments"
  ADD CONSTRAINT "project_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
