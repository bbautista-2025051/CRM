-- Guarda las fotos de perfil en la base de datos en lugar del disco local.
-- En Render el sistema de archivos es efímero: lo guardado en disco se pierde
-- en cada reinicio o despliegue.
CREATE TABLE "user_avatars" (
    "user_id" UUID NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_avatars"
    ADD CONSTRAINT "user_avatars_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
