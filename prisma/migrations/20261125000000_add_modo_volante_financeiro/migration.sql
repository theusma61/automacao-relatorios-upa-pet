-- Fase 2: Modo Volante (Clínicas Parceiras + Controle Financeiro de Cobrança e Repasses)

-- 1. Campo chave_pix no Usuario (opcional, exibido no extrato de cobrança)
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "chave_pix" TEXT;

-- 2. Tabela clinicas_parceiras
CREATE TABLE IF NOT EXISTS "clinicas_parceiras" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_contato" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "cnpj" TEXT,
    "logo_url" TEXT,
    "rodape_contato" TEXT,
    "usar_identidade_propria" BOOLEAN NOT NULL DEFAULT false,
    "valor_padrao_ultrassom" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_padrao_cirurgia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "percentual_repasse" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "dia_fechamento" INTEGER,
    "observacoes" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinicas_parceiras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "clinicas_parceiras_usuario_id_idx" ON "clinicas_parceiras"("usuario_id");
CREATE INDEX IF NOT EXISTS "clinicas_parceiras_usuario_id_ativa_idx" ON "clinicas_parceiras"("usuario_id", "ativa");

DO $$ BEGIN
    ALTER TABLE "clinicas_parceiras"
        ADD CONSTRAINT "clinicas_parceiras_usuario_id_fkey"
        FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Colunas financeiras e vínculo em exames_laudos
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "clinica_parceira_id" TEXT;
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "valor_exame" DECIMAL(10,2);
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "quem_pagou" TEXT NOT NULL DEFAULT 'CLINICA';
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "valor_repasse" DECIMAL(10,2);
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "status_pagamento" TEXT NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "status_repasse" TEXT NOT NULL DEFAULT 'NAO_APLICAVEL';
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "forma_pagamento" TEXT;
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "pago_em" TIMESTAMP(3);
ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "repassado_em" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "exames_laudos_clinica_parceira_id_idx" ON "exames_laudos"("clinica_parceira_id");
CREATE INDEX IF NOT EXISTS "exames_laudos_status_pagamento_idx" ON "exames_laudos"("status_pagamento");

DO $$ BEGIN
    ALTER TABLE "exames_laudos"
        ADD CONSTRAINT "exames_laudos_clinica_parceira_id_fkey"
        FOREIGN KEY ("clinica_parceira_id") REFERENCES "clinicas_parceiras"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. Colunas financeiras e vínculo em relatorios_cirurgicos
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "clinica_parceira_id" TEXT;
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "valor_exame" DECIMAL(10,2);
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "quem_pagou" TEXT NOT NULL DEFAULT 'CLINICA';
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "valor_repasse" DECIMAL(10,2);
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "status_pagamento" TEXT NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "status_repasse" TEXT NOT NULL DEFAULT 'NAO_APLICAVEL';
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "forma_pagamento" TEXT;
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "pago_em" TIMESTAMP(3);
ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "repassado_em" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "relatorios_cirurgicos_clinica_parceira_id_idx" ON "relatorios_cirurgicos"("clinica_parceira_id");
CREATE INDEX IF NOT EXISTS "relatorios_cirurgicos_status_pagamento_idx" ON "relatorios_cirurgicos"("status_pagamento");

DO $$ BEGIN
    ALTER TABLE "relatorios_cirurgicos"
        ADD CONSTRAINT "relatorios_cirurgicos_clinica_parceira_id_fkey"
        FOREIGN KEY ("clinica_parceira_id") REFERENCES "clinicas_parceiras"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
