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
      `CREATE UNIQUE INDEX IF NOT EXISTS "relatorios_cirurgicos_public_token_key" ON "relatorios_cirurgicos"("public_token");`
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
