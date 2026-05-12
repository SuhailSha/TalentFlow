-- AlterTable
ALTER TABLE "email_deliveries" ADD COLUMN "idempotency_key" VARCHAR(255);

-- CreateIndex
CREATE INDEX "email_deliveries_idempotency_key_idx" ON "email_deliveries"("idempotency_key");
