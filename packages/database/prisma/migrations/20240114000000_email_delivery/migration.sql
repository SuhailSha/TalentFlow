-- CreateEnum
CREATE TYPE "email_delivery_status" AS ENUM ('PENDING', 'QUEUED', 'RETRYING', 'SENT', 'FAILED', 'BOUNCED', 'SKIPPED');

-- CreateTable
CREATE TABLE "email_deliveries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "template" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "recipient_user_id" UUID,
    "subject" VARCHAR(255) NOT NULL,
    "status" "email_delivery_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "provider_message_id" VARCHAR(255),
    "provider_response" JSONB,
    "resource_type" VARCHAR(100),
    "resource_id" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_deliveries_organization_id_idx" ON "email_deliveries"("organization_id");

-- CreateIndex
CREATE INDEX "email_deliveries_status_idx" ON "email_deliveries"("status");

-- CreateIndex
CREATE INDEX "email_deliveries_recipient_email_idx" ON "email_deliveries"("recipient_email");

-- CreateIndex
CREATE INDEX "email_deliveries_resource_type_resource_id_idx" ON "email_deliveries"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "email_deliveries_created_at_idx" ON "email_deliveries"("created_at");

-- AddForeignKey
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
