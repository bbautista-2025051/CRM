CREATE TABLE "custom_opportunity_stages" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "normalized_name" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_opportunity_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_opportunity_stages_normalized_name_key"
    ON "custom_opportunity_stages"("normalized_name");

ALTER TABLE "opportunities"
    ALTER COLUMN "stage" DROP DEFAULT,
    ALTER COLUMN "stage" TYPE VARCHAR(60)
        USING CASE "stage"::TEXT
            WHEN 'GANADA' THEN 'GANADA'
            WHEN 'PERDIDA' THEN 'PERDIDA'
            ELSE 'NEGOCIACION'
        END::VARCHAR(60),
    ALTER COLUMN "stage" SET DEFAULT 'NEGOCIACION';

DROP TYPE "OpportunityStage";
