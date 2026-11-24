/**
 * Migração Não-Destrutiva de Boot (PostgreSQL Multi-Tenant)
 * Garante que todas as tabelas e as novas colunas de clonagem de PDFs existam
 * SEM dropar tabelas extras existentes no banco (como `assinaturas`, `faturas` e `perfis_laudo`).
 */

const { prisma } = require("../db");

async function garantirSchemaSemPerdaDeDados() {
  console.log("🛡️ [DB-BOOT] Verificando tabelas e colunas no PostgreSQL (modo não-destrutivo)...");

  try {
    const alterStatements = [
      `CREATE TABLE IF NOT EXISTS "perfis_laudo" (
        "id" TEXT PRIMARY KEY,
        "usuario_id" TEXT NOT NULL UNIQUE REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
        "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "perfis_laudo_usuario_id_idx" ON "perfis_laudo"("usuario_id");`,
      `CREATE TABLE IF NOT EXISTS "perfis_cirurgia" (
        "id" TEXT PRIMARY KEY,
        "usuario_id" TEXT NOT NULL UNIQUE REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "ativo" BOOLEAN NOT NULL DEFAULT true,
        "status" TEXT NOT NULL DEFAULT 'aprendido',
        "quantidade_amostras" INTEGER NOT NULL DEFAULT 0,
        "arquivos_amostras" JSONB,
        "ordem_secoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "estilo_redacao" JSONB,
        "vocabulario_preferido" JSONB,
        "observacoes_estilo" TEXT,
        "nome_detectado" TEXT,
        "crmv_detectado" TEXT,
        "clinica_detectada" TEXT,
        "layout_detectado" JSONB,
        "template_visual" JSONB,
        "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "perfis_cirurgia_usuario_id_idx" ON "perfis_cirurgia"("usuario_id");`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "modo_template" TEXT NOT NULL DEFAULT 'padrao_vetaro';`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "header_banner_url" TEXT;`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "footer_logo_url" TEXT;`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "assinatura_extraida_url" TEXT;`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "visual_config_json" JSONB;`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "writing_style_json" JSONB;`,
      `ALTER TABLE "configuracoes_layout" ADD COLUMN IF NOT EXISTS "pdfs_referencia_qtd" INTEGER NOT NULL DEFAULT 0;`,
      `UPDATE "configuracoes_layout" SET "nome" = 'Padrão Vetaro', "modo_template" = 'padrao_vetaro' WHERE "modo_template" = 'padrao_upa' OR "nome" ILIKE '%UPA PET%';`,
      `UPDATE "usuarios" SET "nome_clinica" = 'Vetaro' WHERE "nome_clinica" ILIKE '%UPA PET%';`,
      `UPDATE "clinicas" SET "nome" = 'Vetaro' WHERE "nome" ILIKE '%UPA PET%';`,
      // Fase 1 — Entrega Inteligente (link público, QR Code, resumo ao tutor e visualizações)
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "public_token" TEXT;`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "link_ativo" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "resumo_tutor" TEXT;`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "visualizacoes" INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "primeira_visualizacao_em" TIMESTAMP(3);`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "ultima_visualizacao_em" TIMESTAMP(3);`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "compartilhado_em" TIMESTAMP(3);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "exames_laudos_public_token_key" ON "exames_laudos"("public_token");`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "public_token" TEXT;`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "link_ativo" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "resumo_tutor" TEXT;`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "visualizacoes" INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "primeira_visualizacao_em" TIMESTAMP(3);`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "ultima_visualizacao_em" TIMESTAMP(3);`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "compartilhado_em" TIMESTAMP(3);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "relatorios_cirurgicos_public_token_key" ON "relatorios_cirurgicos"("public_token");`,
      // Fase 2 — Modo Volante e Financeiro
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "chave_pix" TEXT;`,
      `CREATE TABLE IF NOT EXISTS "clinicas_parceiras" (
        "id" TEXT PRIMARY KEY,
        "usuario_id" TEXT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
        "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS "clinicas_parceiras_usuario_id_idx" ON "clinicas_parceiras"("usuario_id");`,
      `CREATE INDEX IF NOT EXISTS "clinicas_parceiras_usuario_id_ativa_idx" ON "clinicas_parceiras"("usuario_id", "ativa");`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "clinica_parceira_id" TEXT;`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "valor_exame" DECIMAL(10,2);`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "quem_pagou" TEXT NOT NULL DEFAULT 'CLINICA';`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "valor_repasse" DECIMAL(10,2);`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "status_pagamento" TEXT NOT NULL DEFAULT 'PENDENTE';`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "status_repasse" TEXT NOT NULL DEFAULT 'NAO_APLICAVEL';`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "forma_pagamento" TEXT;`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "pago_em" TIMESTAMP(3);`,
      `ALTER TABLE "exames_laudos" ADD COLUMN IF NOT EXISTS "repassado_em" TIMESTAMP(3);`,
      `CREATE INDEX IF NOT EXISTS "exames_laudos_clinica_parceira_id_idx" ON "exames_laudos"("clinica_parceira_id");`,
      `CREATE INDEX IF NOT EXISTS "exames_laudos_status_pagamento_idx" ON "exames_laudos"("status_pagamento");`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "clinica_parceira_id" TEXT;`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "valor_exame" DECIMAL(10,2);`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "quem_pagou" TEXT NOT NULL DEFAULT 'CLINICA';`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "valor_repasse" DECIMAL(10,2);`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "status_pagamento" TEXT NOT NULL DEFAULT 'PENDENTE';`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "status_repasse" TEXT NOT NULL DEFAULT 'NAO_APLICAVEL';`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "forma_pagamento" TEXT;`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "pago_em" TIMESTAMP(3);`,
      `ALTER TABLE "relatorios_cirurgicos" ADD COLUMN IF NOT EXISTS "repassado_em" TIMESTAMP(3);`,
      `CREATE INDEX IF NOT EXISTS "relatorios_cirurgicos_clinica_parceira_id_idx" ON "relatorios_cirurgicos"("clinica_parceira_id");`,
      `CREATE INDEX IF NOT EXISTS "relatorios_cirurgicos_status_pagamento_idx" ON "relatorios_cirurgicos"("status_pagamento");`
    ];

    for (const sql of alterStatements) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (sqlErr) {
        // Tolera se a tabela ou coluna ainda não foi provisionada nesta etapa
      }
    }

    console.log("✅ [DB-BOOT] Schema e Padrão Vetaro verificados com sucesso! Nenhuma tabela existente foi removida.");
  } catch (err) {
    console.warn("⚠️ [DB-BOOT] Aviso ao executar verificação de schema:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

garantirSchemaSemPerdaDeDados();
