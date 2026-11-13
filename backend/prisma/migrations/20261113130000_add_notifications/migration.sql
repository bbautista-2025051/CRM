CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_recipient_id_read_at_created_at_idx"
    ON "notifications"("recipient_id", "read_at", "created_at");

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
