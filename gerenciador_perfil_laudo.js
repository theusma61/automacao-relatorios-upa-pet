/**
 * Gerenciador de Perfil e Estilo de Laudo Personalizado por Usuário (PostgreSQL / Prisma)
 */

const { prisma } = require('./db');
const { salvarLayout, obterLayout, LAYOUT_PADRAO } = require('./gerenciador_layout');

const DISCLAIMER_CANONICO = 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.';

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

    // Sanitiza qualquer contaminação histórica de disclaimer corrompido ou CRMV em contato
    if (perfil.templateVisual) {
      const tv = perfil.templateVisual;
      if (tv.textoAvisoLegal && (/Camila\s*Bastos/i.test(tv.textoAvisoLegal) || !/ultrassom|exame/i.test(tv.textoAvisoLegal) || tv.textoAvisoLegal.startsWith('os achados'))) {
        tv.textoAvisoLegal = DISCLAIMER_CANONICO;
      }
      if (tv.visualConfigClonado?.footerConfig) {
        const fc = tv.visualConfigClonado.footerConfig;
        if (fc.disclaimerText && (/Camila\s*Bastos/i.test(fc.disclaimerText) || !/ultrassom|exame/i.test(fc.disclaimerText) || fc.disclaimerText.startsWith('os achados'))) {
          fc.disclaimerText = DISCLAIMER_CANONICO;
        }
        if (Array.isArray(fc.contactLines)) {
          fc.contactLines = fc.contactLines.filter(l => !/CRMV/i.test(l) && !/(m[eé]dic[oa]|veterin[aá]ri[oa]|dra?\.)/i.test(l));
        }
      }
      if (tv.visualConfigClonado && tv.visualConfigClonado.headerMode === 'inline_logo_beside_patient') {
        if (tv.visualConfigClonado.repeatPatientHeaderOnImagePages !== false) {
          tv.visualConfigClonado.repeatPatientHeaderOnImagePages = true;
          tv.visualConfigClonado.repeatHeaderOnImagePages = true;
        }
      }
    }

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

  // 1. Limpa contaminação de CRMV do rodapé de contato e sanitiza disclaimer
  const tVis = dados.templateVisual || dados.layoutDetectado || {};
  if (tVis.rodapeContato && /CRMV/i.test(tVis.rodapeContato)) {
    tVis.rodapeContato = tVis.rodapeContato.replace(/CRMV[^\s,;•]*/gi, '').replace(/^[\s,;•\-]+|[\s,;•\-]+$/g, '').trim();
  }
  if (tVis.textoAvisoLegal && (/Camila\s*Bastos/i.test(tVis.textoAvisoLegal) || !/ultrassom|exame/i.test(tVis.textoAvisoLegal) || tVis.textoAvisoLegal.startsWith('os achados'))) {
    tVis.textoAvisoLegal = DISCLAIMER_CANONICO;
  }

  // 2. Sincroniza a sequência de órgãos e regras clínicas com writing_style_json
  let visualClonado = tVis.visualConfigClonado || dados.perfilClonado?.layoutVisual || null;
  let writingClonado = tVis.writingStyleClonado || dados.perfilClonado?.estiloEscritaClinica || null;
  const ativosClonados = tVis.ativosVisuais || dados.perfilClonado?.ativosVisuais || {};

  let writingEfetivo = writingClonado;
  if (!writingEfetivo && usuarioId) {
    try {
      const layoutAtual = await obterLayout(usuarioId);
      if (layoutAtual?.writing_style_json) {
        writingEfetivo = JSON.parse(JSON.stringify(layoutAtual.writing_style_json));
      }
      if (!visualClonado && layoutAtual?.visual_config_json) {
        visualClonado = JSON.parse(JSON.stringify(layoutAtual.visual_config_json));
      }
    } catch (_) {}
  }

  if (ordemOrgaos.length > 0) {
    const seqBase = Array.isArray(writingEfetivo?.sequenciaOrgaos) ? writingEfetivo.sequenciaOrgaos : [];
    const novaSequencia = ordemOrgaos.map(org => {
      const orgUpper = String(org).trim().toUpperCase();
      const achado = seqBase.find(o => String(o.orgao).trim().toUpperCase() === orgUpper);

      let textoPadraoNormal = frasesNormalidade[orgUpper] || frasesNormalidade[org] || achado?.textoPadraoNormal || '';
      if (!textoPadraoNormal) {
        if (orgUpper === 'RIM ESQUERDO' || orgUpper === 'RIM DIREITO') {
          textoPadraoNormal = 'Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.';
        } else if (orgUpper === 'RINS') {
          textoPadraoNormal = 'Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: X,XX cm; RD: X,XX cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litíase ou hidronefrose.';
        }
      }

      return {
        orgao: orgUpper,
        textoPadraoNormal,
        ...(achado?.textoQuandoNaoVisualizada ? { textoQuandoNaoVisualizada: achado.textoQuandoNaoVisualizada } : {})
      };
    });

    const querRinsSeparados = ordemOrgaos.some(o => /RIM\s+ESQUERDO/i.test(o)) && ordemOrgaos.some(o => /RIM\s+DIREITO/i.test(o));
    const querRinsUnificados = ordemOrgaos.some(o => /^RINS$/i.test(String(o).trim()));

    writingEfetivo = {
      ...(writingEfetivo || {}),
      sequenciaOrgaos: novaSequencia,
      separarRinsEmDoisTopicos: querRinsSeparados,
      incluirLinhaResumoRins: querRinsUnificados
    };
    tVis.writingStyleClonado = writingEfetivo;
  }

  // Remove linhas de CRMV de footerConfig.contactLines para evitar duplicação no rodapé e sanitiza disclaimer
  if (visualClonado?.footerConfig) {
    if (visualClonado.footerConfig.disclaimerText && (/Camila\s*Bastos/i.test(visualClonado.footerConfig.disclaimerText) || !/ultrassom|exame/i.test(visualClonado.footerConfig.disclaimerText) || visualClonado.footerConfig.disclaimerText.startsWith('os achados'))) {
      visualClonado.footerConfig.disclaimerText = DISCLAIMER_CANONICO;
    }
    if (Array.isArray(visualClonado.footerConfig.contactLines)) {
      visualClonado.footerConfig.contactLines = visualClonado.footerConfig.contactLines.filter(
        l => !/CRMV/i.test(l) && !/(m[eé]dic[oa]|veterin[aá]ri[oa]|dra?\.)/i.test(l)
      );
    }
  }

  if (visualClonado && visualClonado.headerMode === 'inline_logo_beside_patient') {
    if (visualClonado.repeatPatientHeaderOnImagePages !== false) {
      visualClonado.repeatPatientHeaderOnImagePages = true;
      visualClonado.repeatHeaderOnImagePages = true;
    }
  }

  // 3. Atualizar ou criar o registro no modelo PerfilLaudo
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
      templateVisual: tVis
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
      templateVisual: tVis
    }
  });

  // 4. Sincronizar layout detectado (e template clonado geométrico, se presente) com ConfiguracaoLayout do usuário
  if (Object.keys(layout).length > 0 || visualClonado || writingEfetivo) {
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
      payloadLayout.writing_style_json = writingEfetivo || null;
      payloadLayout.header_banner_url = ativosClonados.headerBannerUrl || null;
      payloadLayout.footer_logo_url = ativosClonados.footerLogoUrl || null;
      payloadLayout.assinatura_extraida_url = ativosClonados.assinaturaUrl || null;
      payloadLayout.pdfs_referencia_qtd = quantidadeAmostras || 1;
    } else if (writingEfetivo) {
      payloadLayout.writing_style_json = writingEfetivo;
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
