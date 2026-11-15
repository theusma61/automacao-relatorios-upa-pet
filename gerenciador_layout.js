/**
 * Gerenciador de configurações de layout e modelos (Multi-Tenant PostgreSQL / Prisma)
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
  cor_secundaria: '#4A777A'
};

function prismaParaSnakeCase(row) {
  if (!row) return { ...LAYOUT_PADRAO };
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
      nome: 'Padrão Oficial UPA PET',
      isPadrao: true,
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
  const isCustomUser = Boolean(usuario && usuario.id && usuario.role !== 'admin');
  const atual = await obterLayout(isCustomUser ? usuario.id : null);

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

  if (isCustomUser) {
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
    return prismaParaSnakeCase(row);
  }

  await garantirLayoutPadrao();
  const row = await prisma.configuracaoLayout.update({
    where: { id: 'padrao' },
    data: payloadPrisma
  });
  return prismaParaSnakeCase(row);
}

async function restaurarLayoutPadrao(usuario = null) {
  const isCustomUser = Boolean(usuario && usuario.id && usuario.role !== 'admin');
  if (isCustomUser) {
    await prisma.configuracaoLayout.deleteMany({
      where: { usuarioId: String(usuario.id) }
    });
    return await obterLayout(null);
  }

  const row = await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {
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
    },
    create: {
      id: 'padrao',
      nome: 'Padrão Oficial UPA PET',
      isPadrao: true,
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
  restaurarLayoutPadrao,
  converterParaDocx,
  medidaParaTwips,
  ptParaHalfPoints
};
