-- CreateTable
CREATE TABLE IF NOT EXISTS "perfis_laudo" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'aprendido',
    "quantidade_amostras" INTEGER NOT NULL DEFAULT 0,
    "arquivos_amostras" JSONB,
    "ordem_orgaos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vocabulario_preferido" JSONB,
    "frases_normalidade" JSONB,
    "estilo_conclusao" TEXT,
    "observacoes_estilo" TEXT,
    "nome_detectado" TEXT,
    "crmv_detectado" TEXT,
    "clinica_detectada" TEXT,
    "layout_detectado" JSONB,
    "template_visual" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_laudo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "perfis_laudo_usuario_id_key" ON "perfis_laudo"("usuario_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "perfis_laudo_usuario_id_idx" ON "perfis_laudo"("usuario_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'perfis_laudo_usuario_id_fkey'
    ) THEN
        ALTER TABLE "perfis_laudo" ADD CONSTRAINT "perfis_laudo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
