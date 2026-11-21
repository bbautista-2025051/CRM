-- Todos los proyectos/ventas tienen ticket y su número se asigna de forma
-- automática y consecutiva, del más antiguo al más reciente.
CREATE SEQUENCE IF NOT EXISTS "ticket_number_seq" START 1;

ALTER TABLE "sales" ALTER COLUMN "has_ticket" SET DEFAULT true;
ALTER TABLE "sales" ALTER COLUMN "ticket_stage" SET DEFAULT 'IN_PROGRESS';

UPDATE "sales"
SET
    "has_ticket" = true,
    "ticket_stage" = COALESCE("ticket_stage", 'IN_PROGRESS');

WITH "ordered" AS (
    SELECT
        "id",
        row_number() OVER (
            ORDER BY "sale_date" ASC, "created_at" ASC, "id" ASC
        ) AS "rn"
    FROM "sales"
)
UPDATE "sales" AS "s"
SET "ticket_number" = 'TK-' || lpad("o"."rn"::text, 5, '0')
FROM "ordered" AS "o"
WHERE "s"."id" = "o"."id";

SELECT setval(
    'ticket_number_seq',
    GREATEST((SELECT COUNT(*) FROM "sales"), 1),
    (SELECT COUNT(*) FROM "sales") > 0
);

CREATE UNIQUE INDEX "sales_ticket_number_key"
    ON "sales"("ticket_number");

-- Unifica la conversación: los comentarios y archivos del ticket pasan a ser
-- los mismos que los de la venta, para que ambas cajas estén conectadas.
INSERT INTO "sale_comments" (
    "id",
    "sale_id",
    "author_id",
    "body",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "sale_id",
    "author_id",
    "body",
    "created_at",
    "updated_at"
FROM "ticket_comments"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "sale_files" (
    "id",
    "sale_id",
    "comment_id",
    "original_name",
    "stored_name",
    "mime_type",
    "size",
    "data",
    "uploaded_by_id",
    "created_at"
)
SELECT
    "id",
    "sale_id",
    "comment_id",
    "original_name",
    "stored_name",
    "mime_type",
    "size",
    "data",
    "uploaded_by_id",
    "created_at"
FROM "ticket_files"
ON CONFLICT ("id") DO NOTHING;

DROP TABLE "ticket_files";
DROP TABLE "ticket_comments";
