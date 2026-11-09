-- Almacena el contenido de los archivos de proyecto en la base de datos.
-- Necesario en hosting con sistema de archivos efímero (p. ej. Render), donde
-- los archivos guardados en disco desaparecen tras un reinicio o despliegue.
ALTER TABLE "project_files" ADD COLUMN "data" BYTEA;

-- Los archivos subidos antes de esta migración que aún existan en disco se
-- sirven desde el sistema de archivos como respaldo (data = NULL).
