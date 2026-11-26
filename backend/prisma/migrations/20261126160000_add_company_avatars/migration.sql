-- Logotipo subible por el usuario para cada empresa.
ALTER TABLE "companies"
    ADD COLUMN "avatar_url" VARCHAR(300);

CREATE TABLE "company_avatars" (
    "company_id" UUID NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_avatars_pkey" PRIMARY KEY ("company_id")
);

ALTER TABLE "company_avatars"
    ADD CONSTRAINT "company_avatars_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
