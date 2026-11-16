CREATE TABLE "custom_sale_statuses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "normalized_name" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_sale_statuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_sale_statuses_normalized_name_key"
    ON "custom_sale_statuses"("normalized_name");
