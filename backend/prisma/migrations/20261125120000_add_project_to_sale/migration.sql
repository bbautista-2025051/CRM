-- Vincular una venta con un proyecto (creado automáticamente al confirmar la venta).
ALTER TABLE "sales"
    ADD COLUMN "project_id" UUID;

ALTER TABLE "sales"
    ADD CONSTRAINT "sales_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sales_project_id_idx"
    ON "sales"("project_id");
