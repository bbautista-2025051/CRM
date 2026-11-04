-- Los archivos se adjuntan al comentario con el que se enviaron.

ALTER TABLE "project_files" ADD COLUMN "comment_id" UUID;
CREATE INDEX "project_files_comment_id_idx" ON "project_files"("comment_id");

ALTER TABLE "project_files"
  ADD CONSTRAINT "project_files_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "public"."project_comments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
