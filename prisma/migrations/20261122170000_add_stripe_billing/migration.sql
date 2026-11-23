-- AlterTable: Assinatura (campos de integração Stripe Billing)
ALTER TABLE "assinaturas"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT,
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "assinaturas_stripe_customer_id_key" ON "assinaturas"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "assinaturas_stripe_subscription_id_key" ON "assinaturas"("stripe_subscription_id");

-- AlterTable: Fatura (campos de integração Stripe Invoicing)
ALTER TABLE "faturas"
  ADD COLUMN IF NOT EXISTS "stripe_invoice_id" TEXT,
  ADD COLUMN IF NOT EXISTS "hosted_invoice_url" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "faturas_stripe_invoice_id_key" ON "faturas"("stripe_invoice_id");

-- CreateTable: StripeWebhookEvent (idempotência de webhooks Stripe)
CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "processado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);
