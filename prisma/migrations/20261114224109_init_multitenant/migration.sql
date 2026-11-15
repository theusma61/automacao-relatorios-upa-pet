-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "razao_social" TEXT,
    "cnpj" TEXT,
    "telefone" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "logo_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'pendente',
    "crmv" TEXT,
    "nome_clinica" TEXT,
    "logo_url" TEXT,
    "assinatura_url" TEXT,
    "foto" TEXT,
    "telefone" TEXT,
    "tema_preferencia" TEXT NOT NULL DEFAULT 'system',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "clinica_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_layout" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Padrão Oficial',
    "is_padrao" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" TEXT,
    "clinica_id" TEXT,
    "font_family" TEXT NOT NULL DEFAULT 'Calibri, sans-serif',
    "font_size_body" TEXT NOT NULL DEFAULT '11pt',
    "font_size_titulo" TEXT NOT NULL DEFAULT '14pt',
    "margin_top" TEXT NOT NULL DEFAULT '20mm',
    "margin_bottom" TEXT NOT NULL DEFAULT '20mm',
    "margin_left" TEXT NOT NULL DEFAULT '15mm',
    "margin_right" TEXT NOT NULL DEFAULT '15mm',
    "line_height" TEXT NOT NULL DEFAULT '1.4',
    "paragraph_spacing" TEXT NOT NULL DEFAULT '8pt',
    "cor_primaria" TEXT NOT NULL DEFAULT '#1B365D',
    "cor_secundaria" TEXT NOT NULL DEFAULT '#4A777A',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_cirurgicos" (
    "id" TEXT NOT NULL,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" TEXT,
    "nome" TEXT NOT NULL,
    "sinonimos" TEXT[],
    "procedimento" TEXT NOT NULL,
    "diagnostico_pre_cirurgico" TEXT,
    "descricao_procedimento" TEXT NOT NULL,
    "evolucao_consideracoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_cirurgicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exames_laudos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "paciente_nome" TEXT NOT NULL,
    "paciente_especie" TEXT NOT NULL,
    "paciente_sexo" TEXT,
    "paciente_idade" TEXT,
    "tutor_nome" TEXT,
    "data_exame" TEXT NOT NULL,
    "laudo_estruturado" JSONB NOT NULL,
    "imagens_qtd" INTEGER NOT NULL DEFAULT 0,
    "pdf_arquivo" TEXT,
    "docx_arquivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exames_laudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios_cirurgicos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "paciente_nome" TEXT NOT NULL,
    "paciente_especie" TEXT,
    "procedimento" TEXT NOT NULL,
    "diagnostico" TEXT,
    "modelo_utilizado" TEXT,
    "dados_cirurgia" JSONB NOT NULL,
    "possui_foto" BOOLEAN NOT NULL DEFAULT false,
    "pdf_arquivo" TEXT,
    "docx_arquivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relatorios_cirurgicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_cnpj_key" ON "clinicas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_role_idx" ON "usuarios"("role");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_layout_usuario_id_key" ON "configuracoes_layout"("usuario_id");

-- CreateIndex
CREATE INDEX "configuracoes_layout_usuario_id_idx" ON "configuracoes_layout"("usuario_id");

-- CreateIndex
CREATE INDEX "configuracoes_layout_is_padrao_idx" ON "configuracoes_layout"("is_padrao");

-- CreateIndex
CREATE INDEX "modelos_cirurgicos_usuario_id_idx" ON "modelos_cirurgicos"("usuario_id");

-- CreateIndex
CREATE INDEX "modelos_cirurgicos_is_global_idx" ON "modelos_cirurgicos"("is_global");

-- CreateIndex
CREATE INDEX "modelos_cirurgicos_nome_idx" ON "modelos_cirurgicos"("nome");

-- CreateIndex
CREATE INDEX "exames_laudos_usuario_id_idx" ON "exames_laudos"("usuario_id");

-- CreateIndex
CREATE INDEX "exames_laudos_paciente_nome_idx" ON "exames_laudos"("paciente_nome");

-- CreateIndex
CREATE INDEX "exames_laudos_criado_em_idx" ON "exames_laudos"("criado_em");

-- CreateIndex
CREATE INDEX "relatorios_cirurgicos_usuario_id_idx" ON "relatorios_cirurgicos"("usuario_id");

-- CreateIndex
CREATE INDEX "relatorios_cirurgicos_paciente_nome_idx" ON "relatorios_cirurgicos"("paciente_nome");

-- CreateIndex
CREATE INDEX "relatorios_cirurgicos_criado_em_idx" ON "relatorios_cirurgicos"("criado_em");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_clinica_id_fkey" FOREIGN KEY ("clinica_id") REFERENCES "clinicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_layout" ADD CONSTRAINT "configuracoes_layout_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_layout" ADD CONSTRAINT "configuracoes_layout_clinica_id_fkey" FOREIGN KEY ("clinica_id") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_cirurgicos" ADD CONSTRAINT "modelos_cirurgicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exames_laudos" ADD CONSTRAINT "exames_laudos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_cirurgicos" ADD CONSTRAINT "relatorios_cirurgicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
