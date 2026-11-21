-- Todos los proyectos/ventas tienen ticket y su número se asigna de forma
-- automática usando el mismo secuencial del número de venta
-- (ej. V-2026-00001 -> TK-00001).

ALTER TABLE "sales" ALTER COLUMN "has_ticket" SET DEFAULT true;
ALTER TABLE "sales" ALTER COLUMN "ticket_stage" SET DEFAULT 'IN_PROGRESS';

UPDATE "sales"
SET
    "has_ticket" = true,
    "ticket_stage" = COALESCE("ticket_stage", 'IN_PROGRESS');

-- Número de ticket basado en el secuencial del número de venta:
-- extrae los dígitos finales de "sale_number" (ej. "V-2026-00001" -> 1)
-- y construye "TK-" con relleno a 5 dígitos (ej. "TK-00001").
UPDATE "sales"
SET "ticket_number" = 'TK-' || lpad(
    regexp_replace("sale_number", '^.*-(\d+)$', '\1')::text,
    5, '0'
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
