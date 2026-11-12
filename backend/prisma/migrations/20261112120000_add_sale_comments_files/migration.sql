CREATE TABLE "sale_comments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sale_files" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "comment_id" UUID,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sale_comments_sale_id_created_at_idx"
    ON "sale_comments"("sale_id", "created_at");
CREATE INDEX "sale_files_sale_id_idx"
    ON "sale_files"("sale_id");
CREATE INDEX "sale_files_comment_id_idx"
    ON "sale_files"("comment_id");
CREATE INDEX "sale_files_uploaded_by_id_idx"
    ON "sale_files"("uploaded_by_id");

ALTER TABLE "sale_comments"
    ADD CONSTRAINT "sale_comments_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_comments"
    ADD CONSTRAINT "sale_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_files"
    ADD CONSTRAINT "sale_files_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_files"
    ADD CONSTRAINT "sale_files_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "sale_comments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_files"
    ADD CONSTRAINT "sale_files_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;