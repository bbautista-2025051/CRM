CREATE TABLE "opportunity_comments" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opportunity_files" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "comment_id" UUID,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opportunity_comments_opportunity_id_created_at_idx"
    ON "opportunity_comments"("opportunity_id", "created_at");
CREATE INDEX "opportunity_files_opportunity_id_idx"
    ON "opportunity_files"("opportunity_id");
CREATE INDEX "opportunity_files_comment_id_idx"
    ON "opportunity_files"("comment_id");
CREATE INDEX "opportunity_files_uploaded_by_id_idx"
    ON "opportunity_files"("uploaded_by_id");

ALTER TABLE "opportunity_comments"
    ADD CONSTRAINT "opportunity_comments_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunity_comments"
    ADD CONSTRAINT "opportunity_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunity_files"
    ADD CONSTRAINT "opportunity_files_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunity_files"
    ADD CONSTRAINT "opportunity_files_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "opportunity_comments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunity_files"
    ADD CONSTRAINT "opportunity_files_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
