-- Documentación de la migración: campos de detalles y archivos de un proyecto.
ALTER TABLE "projects" ADD COLUMN "phone" VARCHAR(40);

CREATE TABLE "project_files" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_files_project_id_idx" ON "project_files"("project_id");
CREATE INDEX "project_files_uploaded_by_id_idx" ON "project_files"("uploaded_by_id");

ALTER TABLE "project_files"
    ADD CONSTRAINT "project_files_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_files"
    ADD CONSTRAINT "project_files_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
