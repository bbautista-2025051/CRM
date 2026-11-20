-- Etapa del ticket asociado a una venta.
CREATE TYPE "TicketStage" AS ENUM ('IN_PROGRESS', 'ACCEPTED', 'REJECTED');

-- Datos del ticket en la venta.
ALTER TABLE "sales"
    ADD COLUMN "has_ticket" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "ticket_number" VARCHAR(60),
    ADD COLUMN "ticket_stage" "TicketStage";

-- Comentarios y archivos exclusivos del ticket.
CREATE TABLE "ticket_comments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_files" (
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

    CONSTRAINT "ticket_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticket_comments_sale_id_created_at_idx"
    ON "ticket_comments"("sale_id", "created_at");
CREATE INDEX "ticket_files_sale_id_idx"
    ON "ticket_files"("sale_id");
CREATE INDEX "ticket_files_comment_id_idx"
    ON "ticket_files"("comment_id");
CREATE INDEX "ticket_files_uploaded_by_id_idx"
    ON "ticket_files"("uploaded_by_id");

ALTER TABLE "ticket_comments"
    ADD CONSTRAINT "ticket_comments_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_comments"
    ADD CONSTRAINT "ticket_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_files"
    ADD CONSTRAINT "ticket_files_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_files"
    ADD CONSTRAINT "ticket_files_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "ticket_comments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_files"
    ADD CONSTRAINT "ticket_files_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
