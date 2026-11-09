ALTER TABLE "projects"
ADD COLUMN "opportunity_id" UUID,
ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'GTQ';

ALTER TABLE "projects" ALTER COLUMN "name" TYPE VARCHAR(180);

CREATE UNIQUE INDEX "projects_opportunity_id_key" ON "projects"("opportunity_id");

ALTER TABLE "projects"
ADD CONSTRAINT "projects_opportunity_id_fkey"
FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS project_number_seq START WITH 1 INCREMENT BY 1;
SELECT setval(
  'project_number_seq',
  COALESCE((SELECT MAX("number") FROM "projects"), 0) + 1,
  false
);