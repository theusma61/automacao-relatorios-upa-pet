-- AlterTable: ExameLaudo (Fase 1 — Entrega Inteligente: link público, QR Code, resumo ao tutor e rastreio de visualização)
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "link_ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "resumo_tutor" TEXT;
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "visualizacoes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "primeira_visualizacao_em" TIMESTAMP(3);
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "ultima_visualizacao_em" TIMESTAMP(3);
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "compartilhado_em" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "exames_laudos_public_token_key" ON "exames_laudos"("public_token");

-- AlterTable: RelatorioCirurgico (Fase 1 — Entrega Inteligente)
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "link_ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "resumo_tutor" TEXT;
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "visualizacoes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "primeira_visualizacao_em" TIMESTAMP(3);
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "ultima_visualizacao_em" TIMESTAMP(3);
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "compartilhado_em" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "relatorios_cirurgicos_public_token_key" ON "relatorios_cirurgicos"("public_token");
