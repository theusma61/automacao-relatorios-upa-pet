-- CreateTable: TelemetriaEdicaoLaudo (ranking silencioso de órgãos mais editados no Vetaro Studio)
CREATE TABLE IF NOT EXISTS "telemetria_edicoes_laudo" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "exame_id" TEXT,
    "usuario_id" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "tipo_edicao" TEXT NOT NULL,
    "ia_disse_normal" BOOLEAN NOT NULL DEFAULT false,
    "texto_antes" TEXT,
    "texto_depois" TEXT,
    "diag_dif_antes" TEXT,
    "diag_dif_depois" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetria_edicoes_laudo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telemetria_edicoes_laudo_job_id_orgao_key" ON "telemetria_edicoes_laudo"("job_id", "orgao");
CREATE INDEX IF NOT EXISTS "telemetria_edicoes_laudo_orgao_idx" ON "telemetria_edicoes_laudo"("orgao");
CREATE INDEX IF NOT EXISTS "telemetria_edicoes_laudo_usuario_id_idx" ON "telemetria_edicoes_laudo"("usuario_id");
CREATE INDEX IF NOT EXISTS "telemetria_edicoes_laudo_ia_disse_normal_idx" ON "telemetria_edicoes_laudo"("ia_disse_normal");
CREATE INDEX IF NOT EXISTS "telemetria_edicoes_laudo_criado_em_idx" ON "telemetria_edicoes_laudo"("criado_em");
