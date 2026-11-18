/**
 * Gerenciador de Perfil e Estilo de Laudo Personalizado por Usuário (PostgreSQL / Prisma)
 */

const { prisma } = require('./db');
const { salvarLayout, LAYOUT_PADRAO } = require('./gerenciador_layout');

/**
 * Obtém o perfil de laudo ativo para o usuário.
 * Retorna null se não houver perfil customizado cadastrado.
 */
async function obterPerfilLaudo(usuarioId) {
  if (!usuarioId) return null;

  try {
    const perfil = await prisma.perfilLaudo.findUnique({
      where: { usuarioId: String(usuarioId) }
    });

    if (!perfil || !perfil.ativo) return null;

    return perfil;
  } catch (err) {
    console.error(`❌ Erro ao buscar PerfilLaudo para usuário ${usuarioId}:`, err);
    return null;
  }
}

/**
 * Salva ou atualiza o perfil de laudo de um usuário, sincronizando layout e metadados profissionais.
 */
async function salvarPerfilLaudo(usuarioId, dados = {}) {
  if (!usuarioId) throw new Error('ID do usuário é obrigatório para salvar perfil de laudo.');

  const layout = dados.layoutDetectado || {};
  const ordemOrgaos = Array.isArray(dados.ordemOrgaos) ? dados.ordemOrgaos : [];
  const frasesNormalidade = dados.frasesNormalidade || {};
  const vocabularioPreferido = dados.vocabularioPreferido || {};
  const arquivosAmostras = dados.amostras || dados.arquivosAmostras || [];
  const quantidadeAmostras = typeof dados.quantidadeAmostras === 'number'
    ? dados.quantidadeAmostras
    : (Array.isArray(arquivosAmostras) ? arquivosAmostras.length : 0);

  // 1. Atualizar ou criar o registro no modelo PerfilLaudo
  const perfilAtualizado = await prisma.perfilLaudo.upsert({
    where: { usuarioId: String(usuarioId) },
    update: {
      ativo: dados.ativo !== undefined ? Boolean(dados.ativo) : true,
      status: dados.status || 'aprendido',
      quantidadeAmostras,
      arquivosAmostras,
      ordemOrgaos,
      vocabularioPreferido,
      frasesNormalidade,
      estiloConclusao: dados.estiloConclusao || null,
      observacoesEstilo: dados.observacoesEstilo || null,
      nomeDetectado: dados.nomeDetectado || null,
      crmvDetectado: dados.crmvDetectado || null,
      clinicaDetectada: dados.clinicaDetectada || null,
      layoutDetectado: layout,
      templateVisual: dados.templateVisual || dados.layoutDetectado || null
    },
    create: {
      usuarioId: String(usuarioId),
      ativo: dados.ativo !== undefined ? Boolean(dados.ativo) : true,
      status: dados.status || 'aprendido',
      quantidadeAmostras,
      arquivosAmostras,
      ordemOrgaos,
      vocabularioPreferido,
      frasesNormalidade,
      estiloConclusao: dados.estiloConclusao || null,
      observacoesEstilo: dados.observacoesEstilo || null,
      nomeDetectado: dados.nomeDetectado || null,
      crmvDetectado: dados.crmvDetectado || null,
      clinicaDetectada: dados.clinicaDetectada || null,
      layoutDetectado: layout,
      templateVisual: dados.templateVisual || dados.layoutDetectado || null
    }
  });

  // 2. Sincronizar layout detectado (e template clonado geométrico, se presente) com ConfiguracaoLayout do usuário
  const tVis = dados.templateVisual || {};
  const visualClonado = tVis.visualConfigClonado || dados.perfilClonado?.layoutVisual || null;
  const writingClonado = tVis.writingStyleClonado || dados.perfilClonado?.estiloEscritaClinica || null;
  const ativosClonados = tVis.ativosVisuais || dados.perfilClonado?.ativosVisuais || {};

  if (Object.keys(layout).length > 0 || visualClonado) {
    const payloadLayout = {
      font_family: layout.fontFamily,
      font_size_body: layout.fontSizeBody,
      font_size_titulo: layout.fontSizeTitulo,
      margin_top: layout.marginTop,
      margin_bottom: layout.marginBottom,
      margin_left: layout.marginLeft,
      margin_right: layout.marginRight,
      line_height: layout.lineHeight,
      paragraph_spacing: layout.paragraphSpacing,
      cor_primaria: layout.corPrimaria,
      cor_secundaria: layout.corSecundaria
    };
    if (visualClonado) {
      payloadLayout.modo_template = 'clonado_pdf';
      payloadLayout.visual_config_json = {
        ...visualClonado,
        bodyTypography: {
          ...(visualClonado.bodyTypography || {}),
          ...(layout.fontFamily ? { fontFamily: layout.fontFamily } : {}),
          ...(layout.fontSizeBody ? { fontSize: layout.fontSizeBody } : {}),
          ...(layout.lineHeight ? { lineHeight: String(layout.lineHeight) } : {}),
          ...(layout.paragraphSpacing ? { paragraphSpacing: layout.paragraphSpacing } : {})
        },
        titleConfig: {
          ...(visualClonado.titleConfig || {}),
          ...(layout.fontSizeTitulo ? { fontSize: layout.fontSizeTitulo } : {}),
          ...(tVis.tituloDocumento ? { text: tVis.tituloDocumento } : {}),
          ...(tVis.subtituloDocumento !== undefined ? { subtitle: tVis.subtituloDocumento || null } : {})
        },
        margins: {
          ...(visualClonado.margins || {}),
          ...(layout.marginTop ? { topFirstPage: layout.marginTop } : {}),
          ...(layout.marginBottom ? { bottom: layout.marginBottom } : {}),
          ...(layout.marginLeft ? { left: layout.marginLeft } : {}),
          ...(layout.marginRight ? { right: layout.marginRight } : {})
        },
        ...(ativosClonados.pageBackgroundUrl ? { pageBackgroundUrl: ativosClonados.pageBackgroundUrl } : {}),
        ...(ativosClonados.headerLogoUrl ? { headerLogoUrl: ativosClonados.headerLogoUrl } : {}),
        ...(ativosClonados.headerBannerUrl ? { headerBannerUrl: ativosClonados.headerBannerUrl } : {}),
        ...(ativosClonados.assinaturaUrl ? { assinaturaUrl: ativosClonados.assinaturaUrl } : {}),
        ...(ativosClonados.footerLogoUrl ? { footerLogoUrl: ativosClonados.footerLogoUrl } : {})
      };
      payloadLayout.writing_style_json = writingClonado || null;
      payloadLayout.header_banner_url = ativosClonados.headerBannerUrl || null;
      payloadLayout.footer_logo_url = ativosClonados.footerLogoUrl || null;
      payloadLayout.assinatura_extraida_url = ativosClonados.assinaturaUrl || null;
      payloadLayout.pdfs_referencia_qtd = quantidadeAmostras || 1;
    }
    await salvarLayout(payloadLayout, { id: usuarioId, role: 'veterinario' });
  }

  // 3. Opcionalmente atualizar CRMV e Clínica do usuário se ele permitiu
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

  if (Object.keys(updateUsuario).length > 0) {
    await prisma.usuario.update({
      where: { id: String(usuarioId) },
      data: updateUsuario
    });
  }

  return perfilAtualizado;
}

/**
 * Remove ou desativa o perfil de laudo personalizado, restaurando o padrão oficial.
 */
async function desativarPerfilLaudo(usuarioId) {
  if (!usuarioId) return null;

  try {
    const perfil = await prisma.perfilLaudo.findUnique({
      where: { usuarioId: String(usuarioId) }
    });

    if (perfil) {
      await prisma.perfilLaudo.delete({
        where: { usuarioId: String(usuarioId) }
      });
    }

    return { sucesso: true, mensagem: 'Padrão personalizado removido. Padrão oficial restabelecido.' };
  } catch (err) {
    console.error(`❌ Erro ao desativar perfil de laudo para ${usuarioId}:`, err);
    throw err;
  }
}

module.exports = {
  obterPerfilLaudo,
  salvarPerfilLaudo,
  desativarPerfilLaudo
};
