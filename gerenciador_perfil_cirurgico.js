/**
 * Gerenciador de Perfil e Padrão de Relatório Cirúrgico Personalizado por Usuário (PostgreSQL / Prisma)
 * Espelha o fluxo de PerfilLaudo (ultrassom), com persistência independente para o módulo cirúrgico.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { prisma } = require('./db');
const { normalizarUrlUploadPublica } = require('./gerenciador_usuarios');

function getFallbackJsonPath(usuarioId) {
  const uploadsDir = process.env.UPLOAD_PERSISTENT_DIR
    ? path.resolve(process.env.UPLOAD_PERSISTENT_DIR)
    : path.join(__dirname, 'uploads');
  const idLimpo = String(usuarioId).replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(uploadsDir, 'templates_cirurgia', idLimpo);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'perfil_cirurgico.json');
}

function temModelPrismaPerfilCirurgico() {
  return Boolean(prisma && prisma.perfilCirurgico && typeof prisma.perfilCirurgico.findUnique === 'function');
}

async function obterPerfilCirurgico(usuarioId) {
  if (!usuarioId) return null;
  const uid = String(usuarioId);

  try {
    if (temModelPrismaPerfilCirurgico()) {
      const perfil = await prisma.perfilCirurgico.findUnique({
        where: { usuarioId: uid }
      });
      if (perfil) {
        return perfil.ativo ? perfil : null;
      }
    } else if (prisma && typeof prisma.$queryRawUnsafe === 'function') {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "perfis_cirurgia" WHERE "usuario_id" = $1 LIMIT 1`,
        uid
      ).catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        if (r.ativo === false) return null;
        return {
          id: r.id,
          usuarioId: r.usuario_id,
          ativo: r.ativo,
          status: r.status,
          quantidadeAmostras: r.quantidade_amostras,
          arquivosAmostras: r.arquivos_amostras,
          ordemSecoes: r.ordem_secoes || [],
          estiloRedacao: r.estilo_redacao || {},
          vocabularioPreferido: r.vocabulario_preferido || {},
          observacoesEstilo: r.observacoes_estilo || null,
          nomeDetectado: r.nome_detectado || null,
          crmvDetectado: r.crmv_detectado || null,
          clinicaDetectada: r.clinica_detectada || null,
          layoutDetectado: r.layout_detectado || {},
          templateVisual: r.template_visual || {},
          criadoEm: r.criado_em,
          atualizadoEm: r.atualizado_em
        };
      }
    }
  } catch (err) {
    console.warn(`⚠️ Aviso ao buscar PerfilCirurgico no banco para ${uid}:`, err.message);
  }

  // Fallback local em disco caso a tabela ainda não tenha sido provisionada
  try {
    const jsonPath = getFallbackJsonPath(uid);
    if (fs.existsSync(jsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (parsed && parsed.ativo !== false) return parsed;
    }
  } catch (_) {}

  return null;
}

async function salvarPerfilCirurgico(usuarioId, dados = {}) {
  if (!usuarioId) throw new Error('ID do usuário é obrigatório para salvar perfil cirúrgico.');
  const uid = String(usuarioId);

  const layout = dados.layoutDetectado || {};
  const ordemSecoes = Array.isArray(dados.ordemSecoes) ? dados.ordemSecoes : [];
  const estiloRedacao = dados.estiloRedacao || {};
  const vocabularioPreferido = dados.vocabularioPreferido || {};
  const arquivosAmostras = dados.amostras || dados.arquivosAmostras || [];
  const quantidadeAmostras = typeof dados.quantidadeAmostras === 'number'
    ? dados.quantidadeAmostras
    : (Array.isArray(arquivosAmostras) ? arquivosAmostras.length : 0);

  const tVis = { ...(dados.templateVisual || dados.layoutDetectado || {}) };
  if (tVis.rodapeContato && /CRMV/i.test(tVis.rodapeContato)) {
    tVis.rodapeContato = tVis.rodapeContato
      .replace(/CRMV[^\s,;•]*/gi, '')
      .replace(/^[\s,;•\-]+|[\s,;•\-]+$/g, '')
      .trim();
  }

  const ativosClonados = tVis.ativosVisuais || dados.perfilClonado?.ativosVisuais || {};
  if (ativosClonados.headerLogoUrl) {
    ativosClonados.headerLogoUrl = normalizarUrlUploadPublica(ativosClonados.headerLogoUrl);
  }
  if (ativosClonados.headerBannerUrl) {
    ativosClonados.headerBannerUrl = normalizarUrlUploadPublica(ativosClonados.headerBannerUrl);
  }
  if (ativosClonados.assinaturaUrl) {
    ativosClonados.assinaturaUrl = normalizarUrlUploadPublica(ativosClonados.assinaturaUrl);
  }
  if (Object.keys(ativosClonados).length > 0) {
    tVis.ativosVisuais = ativosClonados;
  }

  const payloadRegistro = {
    ativo: dados.ativo !== undefined ? Boolean(dados.ativo) : true,
    status: dados.status || 'aprendido',
    quantidadeAmostras,
    arquivosAmostras,
    ordemSecoes,
    estiloRedacao,
    vocabularioPreferido,
    observacoesEstilo: dados.observacoesEstilo || null,
    nomeDetectado: dados.nomeDetectado || null,
    crmvDetectado: dados.crmvDetectado || null,
    clinicaDetectada: dados.clinicaDetectada || null,
    layoutDetectado: layout,
    templateVisual: tVis
  };

  let perfilSalvo = null;

  try {
    if (temModelPrismaPerfilCirurgico()) {
      perfilSalvo = await prisma.perfilCirurgico.upsert({
        where: { usuarioId: uid },
        update: payloadRegistro,
        create: {
          usuarioId: uid,
          ...payloadRegistro
        }
      });
    } else if (prisma && typeof prisma.$executeRawUnsafe === 'function') {
      const novoId = `pc_${crypto.randomBytes(8).toString('hex')}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "perfis_cirurgia" (
          "id", "usuario_id", "ativo", "status", "quantidade_amostras", "arquivos_amostras",
          "ordem_secoes", "estilo_redacao", "vocabulario_preferido", "observacoes_estilo",
          "nome_detectado", "crmv_detectado", "clinica_detectada", "layout_detectado", "template_visual",
          "criado_em", "atualizado_em"
        ) VALUES (
          $1, $2, $3, $4, $5, $6::jsonb,
          $7::text[], $8::jsonb, $9::jsonb, $10,
          $11, $12, $13, $14::jsonb, $15::jsonb,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("usuario_id") DO UPDATE SET
          "ativo" = EXCLUDED."ativo",
          "status" = EXCLUDED."status",
          "quantidade_amostras" = EXCLUDED."quantidade_amostras",
          "arquivos_amostras" = EXCLUDED."arquivos_amostras",
          "ordem_secoes" = EXCLUDED."ordem_secoes",
          "estilo_redacao" = EXCLUDED."estilo_redacao",
          "vocabulario_preferido" = EXCLUDED."vocabulario_preferido",
          "observacoes_estilo" = EXCLUDED."observacoes_estilo",
          "nome_detectado" = EXCLUDED."nome_detectado",
          "crmv_detectado" = EXCLUDED."crmv_detectado",
          "clinica_detectada" = EXCLUDED."clinica_detectada",
          "layout_detectado" = EXCLUDED."layout_detectado",
          "template_visual" = EXCLUDED."template_visual",
          "atualizado_em" = CURRENT_TIMESTAMP`,
        novoId,
        uid,
        payloadRegistro.ativo,
        payloadRegistro.status,
        payloadRegistro.quantidadeAmostras,
        JSON.stringify(payloadRegistro.arquivosAmostras || []),
        payloadRegistro.ordemSecoes || [],
        JSON.stringify(payloadRegistro.estiloRedacao || {}),
        JSON.stringify(payloadRegistro.vocabularioPreferido || {}),
        payloadRegistro.observacoesEstilo,
        payloadRegistro.nomeDetectado,
        payloadRegistro.crmvDetectado,
        payloadRegistro.clinicaDetectada,
        JSON.stringify(payloadRegistro.layoutDetectado || {}),
        JSON.stringify(payloadRegistro.templateVisual || {})
      );
      perfilSalvo = { id: novoId, usuarioId: uid, ...payloadRegistro, atualizadoEm: new Date().toISOString() };
    }
  } catch (err) {
    console.warn(`⚠️ Aviso ao persistir PerfilCirurgico no banco para ${uid} (usando fallback local):`, err.message);
  }

  // Salva também espelho local para resiliência
  try {
    const jsonPath = getFallbackJsonPath(uid);
    const paraSalvar = perfilSalvo || { id: `pc_local_${uid}`, usuarioId: uid, ...payloadRegistro, atualizadoEm: new Date().toISOString() };
    fs.writeFileSync(jsonPath, JSON.stringify(paraSalvar, null, 2), 'utf8');
    if (!perfilSalvo) perfilSalvo = paraSalvar;
  } catch (_) {}

  // Opcionalmente atualiza CRMV, clínica, nome, logo e assinatura no usuário
  const updateUsuario = {};
  if (dados.crmvDetectado && dados.atualizarUsuarioCrmv) {
    updateUsuario.crmv = dados.crmvDetectado;
  }
  if (dados.clinicaDetectada && dados.atualizarUsuarioClinica) {
    updateUsuario.nomeClinica = dados.clinicaDetectada;
  }
  if (dados.nomeDetectado && dados.atualizarUsuarioNome) {
    updateUsuario.nome = dados.nomeDetectado;
  }
  if (ativosClonados.headerLogoUrl) {
    updateUsuario.logoUrl = ativosClonados.headerLogoUrl;
  }
  if (ativosClonados.assinaturaUrl) {
    updateUsuario.assinaturaUrl = ativosClonados.assinaturaUrl;
  }

  if (Object.keys(updateUsuario).length > 0 && prisma?.usuario?.update) {
    await prisma.usuario.update({
      where: { id: uid },
      data: updateUsuario
    }).catch(() => {});
  }

  return perfilSalvo;
}

async function desativarPerfilCirurgico(usuarioId) {
  if (!usuarioId) return null;
  const uid = String(usuarioId);

  try {
    if (temModelPrismaPerfilCirurgico()) {
      await prisma.perfilCirurgico.deleteMany({
        where: { usuarioId: uid }
      });
    } else if (prisma && typeof prisma.$executeRawUnsafe === 'function') {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "perfis_cirurgia" WHERE "usuario_id" = $1`,
        uid
      ).catch(() => {});
    }
  } catch (err) {
    console.warn(`⚠️ Aviso ao remover PerfilCirurgico do banco para ${uid}:`, err.message);
  }

  try {
    const jsonPath = getFallbackJsonPath(uid);
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
  } catch (_) {}

  return { sucesso: true, mensagem: 'Padrão cirúrgico personalizado removido. Padrão oficial restabelecido.' };
}

module.exports = {
  obterPerfilCirurgico,
  salvarPerfilCirurgico,
  desativarPerfilCirurgico
};
