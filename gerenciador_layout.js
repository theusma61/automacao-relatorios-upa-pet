/**
 * Gerenciador de configurações de layout e modelos (Multi-Tenant PostgreSQL / Prisma)
 * Suporta tanto o layout Padrão Vetaro quanto o perfil 100% agnóstico clonado de 1 a 10 PDFs.
 */

const { prisma } = require('./db');

const LAYOUT_PADRAO = {
  id: 'padrao',
  font_family: 'Calibri, sans-serif',
  font_size_body: '11pt',
  font_size_titulo: '14pt',
  margin_top: '20mm',
  margin_bottom: '20mm',
  margin_left: '15mm',
  margin_right: '15mm',
  line_height: '1.4',
  paragraph_spacing: '8pt',
  cor_primaria: '#1B365D',
  cor_secundaria: '#4A777A',
  modo_template: 'padrao_vetaro',
  page_background_url: null,
  header_banner_url: null,
  footer_logo_url: null,
  assinatura_extraida_url: null,
  visual_config_json: null,
  writing_style_json: null,
  pdfs_referencia_qtd: 0
};

function normalizarModoTemplate(modo) {
  if (!modo || modo === 'padrao_upa') return 'padrao_vetaro';
  return modo;
}

const DISCLAIMER_CANONICO_PADRAO = 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.';

function sanitizarVisualConfigClonado(vc) {
  if (!vc || typeof vc !== 'object') return vc;
  const clone = JSON.parse(JSON.stringify(vc));
  if (clone.footerConfig) {
    const fc = clone.footerConfig;
    if (fc.disclaimerText && (/Camila\s*Bastos/i.test(fc.disclaimerText) || !/ultrassom|exame/i.test(fc.disclaimerText) || fc.disclaimerText.startsWith('os achados'))) {
      fc.disclaimerText = DISCLAIMER_CANONICO_PADRAO;
    }
    if (Array.isArray(fc.contactLines)) {
      fc.contactLines = fc.contactLines.filter(l => !/CRMV/i.test(l) && !/(m[eé]dic[oa]|veterin[aá]ri[oa]|dra?\.)/i.test(l));
    }
  }
  if (clone.headerMode === 'inline_logo_beside_patient' || clone.stationeryMode === 'inline_logo_header') {
    clone.repeatPatientHeaderOnImagePages = true;
    clone.repeatHeaderOnImagePages = true;
  }
  return clone;
}

function prismaParaSnakeCase(row) {
  if (!row) return { ...LAYOUT_PADRAO };
  const rawVisual = row.visualConfigJson || row.visual_config_json || null;
  const visualJson = sanitizarVisualConfigClonado(rawVisual);
  return {
    id: row.id || 'padrao',
    usuario_id: row.usuarioId || null,
    clinica_id: row.clinicaId || null,
    font_family: row.fontFamily || LAYOUT_PADRAO.font_family,
    font_size_body: row.fontSizeBody || LAYOUT_PADRAO.font_size_body,
    font_size_titulo: row.fontSizeTitulo || LAYOUT_PADRAO.font_size_titulo,
    margin_top: row.marginTop || LAYOUT_PADRAO.margin_top,
    margin_bottom: row.marginBottom || LAYOUT_PADRAO.margin_bottom,
    margin_left: row.marginLeft || LAYOUT_PADRAO.margin_left,
    margin_right: row.marginRight || LAYOUT_PADRAO.margin_right,
    line_height: row.lineHeight || LAYOUT_PADRAO.line_height,
    paragraph_spacing: row.paragraphSpacing || LAYOUT_PADRAO.paragraph_spacing,
    cor_primaria: row.corPrimaria || LAYOUT_PADRAO.cor_primaria,
    cor_secundaria: row.corSecundaria || LAYOUT_PADRAO.cor_secundaria,
    modo_template: normalizarModoTemplate(row.modoTemplate || row.modo_template),
    page_background_url: row.page_background_url || (visualJson && visualJson.pageBackgroundUrl) || null,
    header_logo_url: row.header_logo_url || (visualJson && visualJson.headerLogoUrl) || null,
    header_banner_url: row.headerBannerUrl || row.header_banner_url || null,
    footer_logo_url: row.footerLogoUrl || row.footer_logo_url || null,
    assinatura_extraida_url: row.assinaturaExtraidaUrl || row.assinatura_extraida_url || null,
    visual_config_json: visualJson,
    writing_style_json: row.writingStyleJson || row.writing_style_json || null,
    pdfs_referencia_qtd: row.pdfsReferenciaQtd ?? row.pdfs_referencia_qtd ?? 0,
    atualizado_em: row.atualizadoEm instanceof Date
      ? row.atualizadoEm.toISOString()
      : (row.atualizado_em || new Date().toISOString())
  };
}

async function garantirLayoutPadrao() {
  return await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {},
    create: {
      id: 'padrao',
      nome: 'Padrão Vetaro',
      isPadrao: true,
      modoTemplate: 'padrao_vetaro',
      fontFamily: LAYOUT_PADRAO.font_family,
      fontSizeBody: LAYOUT_PADRAO.font_size_body,
      fontSizeTitulo: LAYOUT_PADRAO.font_size_titulo,
      marginTop: LAYOUT_PADRAO.margin_top,
      marginBottom: LAYOUT_PADRAO.margin_bottom,
      marginLeft: LAYOUT_PADRAO.margin_left,
      marginRight: LAYOUT_PADRAO.margin_right,
      lineHeight: LAYOUT_PADRAO.line_height,
      paragraphSpacing: LAYOUT_PADRAO.paragraph_spacing,
      corPrimaria: LAYOUT_PADRAO.cor_primaria,
      corSecundaria: LAYOUT_PADRAO.cor_secundaria
    }
  });
}

async function obterLayout(usuarioId = null) {
  if (usuarioId) {
    const custom = await prisma.configuracaoLayout.findUnique({
      where: { usuarioId: String(usuarioId) }
    });
    if (custom) return prismaParaSnakeCase(custom);
  }

  const row = await garantirLayoutPadrao();
  return prismaParaSnakeCase(row);
}

async function salvarLayout(dadosNovos = {}, usuario = null) {
  const temUsuarioId = Boolean(usuario && usuario.id);
  const atual = await obterLayout(temUsuarioId ? usuario.id : null);

  const payloadPrisma = {
    fontFamily: dadosNovos.font_family || atual.font_family,
    fontSizeBody: dadosNovos.font_size_body || atual.font_size_body,
    fontSizeTitulo: dadosNovos.font_size_titulo || atual.font_size_titulo,
    marginTop: dadosNovos.margin_top || atual.margin_top,
    marginBottom: dadosNovos.margin_bottom || atual.margin_bottom,
    marginLeft: dadosNovos.margin_left || atual.margin_left,
    marginRight: dadosNovos.margin_right || atual.margin_right,
    lineHeight: dadosNovos.line_height !== undefined ? String(dadosNovos.line_height) : atual.line_height,
    paragraphSpacing: dadosNovos.paragraph_spacing || atual.paragraph_spacing,
    corPrimaria: dadosNovos.cor_primaria || atual.cor_primaria,
    corSecundaria: dadosNovos.cor_secundaria || atual.cor_secundaria
  };

  if (dadosNovos.modo_template !== undefined) {
    payloadPrisma.modoTemplate = normalizarModoTemplate(dadosNovos.modo_template);
  } else if (atual.modo_template === 'clonado_pdf') {
    payloadPrisma.modoTemplate = 'clonado_pdf';
  }
  if (dadosNovos.header_banner_url !== undefined) payloadPrisma.headerBannerUrl = dadosNovos.header_banner_url;
  else if (atual.header_banner_url) payloadPrisma.headerBannerUrl = atual.header_banner_url;

  if (dadosNovos.footer_logo_url !== undefined) payloadPrisma.footerLogoUrl = dadosNovos.footer_logo_url;
  else if (atual.footer_logo_url) payloadPrisma.footerLogoUrl = atual.footer_logo_url;

  if (dadosNovos.assinatura_extraida_url !== undefined) payloadPrisma.assinaturaExtraidaUrl = dadosNovos.assinatura_extraida_url;
  else if (atual.assinatura_extraida_url) payloadPrisma.assinaturaExtraidaUrl = atual.assinatura_extraida_url;
  if (dadosNovos.visual_config_json !== undefined) {
    payloadPrisma.visualConfigJson = sanitizarVisualConfigClonado(dadosNovos.visual_config_json);
  } else if (atual.visual_config_json && typeof atual.visual_config_json === 'object') {
    // Propaga edições manuais do editor (espaçamento entre categorias, entrelinha, fonte, margens) para o template clonado
    const vc = JSON.parse(JSON.stringify(atual.visual_config_json));
    vc.bodyTypography = {
      ...(vc.bodyTypography || {}),
      ...(dadosNovos.font_family ? { fontFamily: dadosNovos.font_family } : {}),
      ...(dadosNovos.font_size_body ? { fontSize: dadosNovos.font_size_body } : {}),
      ...(dadosNovos.line_height !== undefined ? { lineHeight: String(dadosNovos.line_height) } : {}),
      ...(dadosNovos.paragraph_spacing ? { paragraphSpacing: dadosNovos.paragraph_spacing } : {})
    };
    if (dadosNovos.font_size_titulo) {
      vc.titleConfig = { ...(vc.titleConfig || {}), fontSize: dadosNovos.font_size_titulo };
    }
    vc.margins = {
      ...(vc.margins || {}),
      ...(dadosNovos.margin_top ? { topFirstPage: dadosNovos.margin_top } : {}),
      ...(dadosNovos.margin_bottom ? { bottom: dadosNovos.margin_bottom } : {}),
      ...(dadosNovos.margin_left ? { left: dadosNovos.margin_left } : {}),
      ...(dadosNovos.margin_right ? { right: dadosNovos.margin_right } : {})
    };
    payloadPrisma.visualConfigJson = sanitizarVisualConfigClonado(vc);
  }
  if (dadosNovos.writing_style_json !== undefined) payloadPrisma.writingStyleJson = dadosNovos.writing_style_json;
  if (dadosNovos.pdfs_referencia_qtd !== undefined) payloadPrisma.pdfsReferenciaQtd = Number(dadosNovos.pdfs_referencia_qtd) || 0;

  // Sincroniza também os ajustes de tipografia/margens no PerfilLaudo do usuário, se existir
  const sincronizarPerfilLaudoUsuario = async (uid) => {
    if (!uid) return;
    try {
      const perfil = await prisma.perfilLaudo.findUnique({ where: { usuarioId: String(uid) } });
      if (!perfil) return;
      const layoutDet = {
        ...(perfil.layoutDetectado && typeof perfil.layoutDetectado === 'object' ? perfil.layoutDetectado : {}),
        fontFamily: payloadPrisma.fontFamily,
        fontSizeBody: payloadPrisma.fontSizeBody,
        fontSizeTitulo: payloadPrisma.fontSizeTitulo,
        marginTop: payloadPrisma.marginTop,
        marginBottom: payloadPrisma.marginBottom,
        marginLeft: payloadPrisma.marginLeft,
        marginRight: payloadPrisma.marginRight,
        lineHeight: payloadPrisma.lineHeight,
        paragraphSpacing: payloadPrisma.paragraphSpacing,
        corPrimaria: payloadPrisma.corPrimaria,
        corSecundaria: payloadPrisma.corSecundaria
      };
      const tVis = {
        ...(perfil.templateVisual && typeof perfil.templateVisual === 'object' ? perfil.templateVisual : {}),
        fontFamily: payloadPrisma.fontFamily,
        fontSizeBody: payloadPrisma.fontSizeBody,
        fontSizeTitulo: payloadPrisma.fontSizeTitulo,
        marginTop: payloadPrisma.marginTop,
        marginBottom: payloadPrisma.marginBottom,
        marginLeft: payloadPrisma.marginLeft,
        marginRight: payloadPrisma.marginRight,
        lineHeight: payloadPrisma.lineHeight,
        paragraphSpacing: payloadPrisma.paragraphSpacing,
        corPrimaria: payloadPrisma.corPrimaria,
        corSecundaria: payloadPrisma.corSecundaria
      };
      if (payloadPrisma.visualConfigJson) {
        tVis.visualConfigClonado = payloadPrisma.visualConfigJson;
      }
      await prisma.perfilLaudo.update({
        where: { usuarioId: String(uid) },
        data: { layoutDetectado: layoutDet, templateVisual: tVis }
      });
    } catch (_) {}
  };

  if (temUsuarioId) {
    const row = await prisma.configuracaoLayout.upsert({
      where: { usuarioId: String(usuario.id) },
      update: payloadPrisma,
      create: {
        id: `layout_${usuario.id}`,
        nome: `Layout de ${usuario.nome || usuario.email}`,
        isPadrao: false,
        usuarioId: String(usuario.id),
        ...payloadPrisma
      }
    });
    await sincronizarPerfilLaudoUsuario(usuario.id);
    return prismaParaSnakeCase(row);
  }

  await garantirLayoutPadrao();
  const row = await prisma.configuracaoLayout.update({
    where: { id: 'padrao' },
    data: payloadPrisma
  });
  return prismaParaSnakeCase(row);
}

/**
 * Persiste o template completo extraído de 1 a 10 PDFs para o médico veterinário.
 */
async function salvarTemplateClonado(perfilExtraido, usuario = null) {
  const lv = { ...(perfilExtraido?.layoutVisual || {}) };
  const bodyTypo = lv.bodyTypography || {};
  const titleCfg = lv.titleConfig || {};
  const margins = lv.margins || {};
  const ativos = perfilExtraido?.ativosVisuais || {};

  if (ativos.pageBackgroundUrl) {
    lv.pageBackgroundUrl = ativos.pageBackgroundUrl;
  }
  if (ativos.headerLogoUrl) {
    lv.headerLogoUrl = ativos.headerLogoUrl;
  }
  if (ativos.headerBannerUrl) {
    lv.headerBannerUrl = ativos.headerBannerUrl;
  }
  if (ativos.assinaturaUrl) {
    lv.assinaturaUrl = ativos.assinaturaUrl;
  }
  if (ativos.footerLogoUrl) {
    lv.footerLogoUrl = ativos.footerLogoUrl;
  }

  const dadosLayout = {
    font_family: bodyTypo.fontFamily || LAYOUT_PADRAO.font_family,
    font_size_body: bodyTypo.fontSize || LAYOUT_PADRAO.font_size_body,
    font_size_titulo: titleCfg.fontSize || '11pt',
    margin_top: margins.topFirstPage || '20mm',
    margin_bottom: margins.bottom || '20mm',
    margin_left: margins.left || '15mm',
    margin_right: margins.right || '15mm',
    line_height: bodyTypo.lineHeight || '1.45',
    paragraph_spacing: bodyTypo.paragraphSpacing || '8pt',
    cor_primaria: titleCfg.color || '#000000',
    cor_secundaria: '#333333',
    modo_template: 'clonado_pdf',
    page_background_url: ativos.pageBackgroundUrl || null,
    header_banner_url: ativos.headerBannerUrl || null,
    footer_logo_url: ativos.footerLogoUrl || null,
    assinatura_extraida_url: ativos.assinaturaUrl || null,
    visual_config_json: lv,
    writing_style_json: perfilExtraido?.estiloEscritaClinica || null,
    pdfs_referencia_qtd: perfilExtraido?.pdfsAnalisados || 1
  };

  return await salvarLayout(dadosLayout, usuario);
}

async function restaurarLayoutPadrao(usuario = null) {
  if (usuario && usuario.id) {
    await prisma.configuracaoLayout.deleteMany({
      where: { usuarioId: String(usuario.id) }
    }).catch(() => {});
  }

  const row = await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {
      nome: 'Padrão Vetaro',
      fontFamily: LAYOUT_PADRAO.font_family,
      fontSizeBody: LAYOUT_PADRAO.font_size_body,
      fontSizeTitulo: LAYOUT_PADRAO.font_size_titulo,
      marginTop: LAYOUT_PADRAO.margin_top,
      marginBottom: LAYOUT_PADRAO.margin_bottom,
      marginLeft: LAYOUT_PADRAO.margin_left,
      marginRight: LAYOUT_PADRAO.margin_right,
      lineHeight: LAYOUT_PADRAO.line_height,
      paragraphSpacing: LAYOUT_PADRAO.paragraph_spacing,
      corPrimaria: LAYOUT_PADRAO.cor_primaria,
      corSecundaria: LAYOUT_PADRAO.cor_secundaria,
      modoTemplate: 'padrao_vetaro',
      headerBannerUrl: null,
      footerLogoUrl: null,
      assinaturaExtraidaUrl: null,
      visualConfigJson: null,
      writingStyleJson: null,
      pdfsReferenciaQtd: 0
    },
    create: {
      id: 'padrao',
      nome: 'Padrão Vetaro',
      isPadrao: true,
      modoTemplate: 'padrao_vetaro',
      fontFamily: LAYOUT_PADRAO.font_family,
      fontSizeBody: LAYOUT_PADRAO.font_size_body,
      fontSizeTitulo: LAYOUT_PADRAO.font_size_titulo,
      marginTop: LAYOUT_PADRAO.margin_top,
      marginBottom: LAYOUT_PADRAO.margin_bottom,
      marginLeft: LAYOUT_PADRAO.margin_left,
      marginRight: LAYOUT_PADRAO.margin_right,
      lineHeight: LAYOUT_PADRAO.line_height,
      paragraphSpacing: LAYOUT_PADRAO.paragraph_spacing,
      corPrimaria: LAYOUT_PADRAO.cor_primaria,
      corSecundaria: LAYOUT_PADRAO.cor_secundaria
    }
  });
  return prismaParaSnakeCase(row);
}

function medidaParaTwips(valorStr, fallbackTwips = 850) {
  if (!valorStr || typeof valorStr !== 'string') return fallbackTwips;
  const limpo = valorStr.trim().toLowerCase();

  const matchMm = limpo.match(/^([\d.]+)\s*mm$/);
  if (matchMm) {
    const mm = parseFloat(matchMm[1]);
    return Math.round(mm * 56.6929);
  }

  const matchPt = limpo.match(/^([\d.]+)\s*pt$/);
  if (matchPt) {
    const pt = parseFloat(matchPt[1]);
    return Math.round(pt * 20);
  }

  const num = parseFloat(limpo);
  if (!isNaN(num)) {
    return num <= 40 ? Math.round(num * 56.6929) : Math.round(num);
  }

  return fallbackTwips;
}

function ptParaHalfPoints(valorStr, fallbackHalfPoints = 22) {
  if (!valorStr || typeof valorStr !== 'string') return fallbackHalfPoints;
  const match = valorStr.trim().match(/^([\d.]+)/);
  if (!match) return fallbackHalfPoints;
  const pt = parseFloat(match[1]);
  return isNaN(pt) ? fallbackHalfPoints : Math.round(pt * 2);
}

function converterParaDocx(layout) {
  const cfg = layout || LAYOUT_PADRAO;

  const fontMatch = (cfg.font_family || 'Calibri').split(',')[0].replace(/['"]/g, '').trim();
  const szCorpo = ptParaHalfPoints(cfg.font_size_body, 22);
  const szTitulo = ptParaHalfPoints(cfg.font_size_titulo, 28);

  const marginTop = medidaParaTwips(cfg.margin_top, 1134);
  const marginBottom = medidaParaTwips(cfg.margin_bottom, 1134);
  const marginLeft = medidaParaTwips(cfg.margin_left, 850);
  const marginRight = medidaParaTwips(cfg.margin_right, 850);

  const spacingAfter = medidaParaTwips(cfg.paragraph_spacing, 160);
  const lineMultiplier = parseFloat(cfg.line_height) || 1.4;
  const lineSpacing = Math.round(lineMultiplier * 240);

  const corPrimariaHex = (cfg.cor_primaria || '#1B365D').replace(/^#/, '').toUpperCase();
  const corSecundariaHex = (cfg.cor_secundaria || '#4A777A').replace(/^#/, '').toUpperCase();

  return {
    fontFamily: fontMatch,
    szCorpo,
    szTitulo,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    spacingAfter,
    lineSpacing,
    corPrimariaHex,
    corSecundariaHex
  };
}

module.exports = {
  LAYOUT_PADRAO,
  obterLayout,
  salvarLayout,
  salvarTemplateClonado,
  restaurarLayoutPadrao,
  converterParaDocx,
  medidaParaTwips,
  ptParaHalfPoints
};
