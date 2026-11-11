/**
 * Gerenciador de configurações de layout e modelos (UPA PET)
 * Centraliza a leitura, atualização e conversão das regras tipográficas e visuais
 * persistidas no SQLite (tabela `configuracoes_layout`).
 */

const { getDatabase } = require('./db');

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

/**
 * Retorna as configurações atuais de layout gravadas no SQLite.
 * Caso o registro não exista, inicializa com o padrão institucional.
 */
function obterLayout() {
  const db = getDatabase();
  let row = db.prepare('SELECT * FROM configuracoes_layout WHERE id = ?').get('padrao');

  if (!row) {
    db.prepare(`
      INSERT INTO configuracoes_layout (
        id, font_family, font_size_body, font_size_titulo,
        margin_top, margin_bottom, margin_left, margin_right,
        line_height, paragraph_spacing, cor_primaria, cor_secundaria
      ) VALUES (
        @id, @font_family, @font_size_body, @font_size_titulo,
        @margin_top, @margin_bottom, @margin_left, @margin_right,
        @line_height, @paragraph_spacing, @cor_primaria, @cor_secundaria
      )
    `).run(LAYOUT_PADRAO);

    row = db.prepare('SELECT * FROM configuracoes_layout WHERE id = ?').get('padrao');
  }

  return row;
}

/**
 * Atualiza as configurações de layout no banco.
 * Apenas os campos fornecidos são alterados.
 */
function salvarLayout(dadosNovos = {}) {
  const db = getDatabase();
  const atual = obterLayout();

  const atualizado = {
    font_family: dadosNovos.font_family || atual.font_family,
    font_size_body: dadosNovos.font_size_body || atual.font_size_body,
    font_size_titulo: dadosNovos.font_size_titulo || atual.font_size_titulo,
    margin_top: dadosNovos.margin_top || atual.margin_top,
    margin_bottom: dadosNovos.margin_bottom || atual.margin_bottom,
    margin_left: dadosNovos.margin_left || atual.margin_left,
    margin_right: dadosNovos.margin_right || atual.margin_right,
    line_height: dadosNovos.line_height !== undefined ? String(dadosNovos.line_height) : atual.line_height,
    paragraph_spacing: dadosNovos.paragraph_spacing || atual.paragraph_spacing,
    cor_primaria: dadosNovos.cor_primaria || atual.cor_primaria,
    cor_secundaria: dadosNovos.cor_secundaria || atual.cor_secundaria,
    id: 'padrao'
  };

  const stmt = db.prepare(`
    UPDATE configuracoes_layout
    SET
      font_family = @font_family,
      font_size_body = @font_size_body,
      font_size_titulo = @font_size_titulo,
      margin_top = @margin_top,
      margin_bottom = @margin_bottom,
      margin_left = @margin_left,
      margin_right = @margin_right,
      line_height = @line_height,
      paragraph_spacing = @paragraph_spacing,
      cor_primaria = @cor_primaria,
      cor_secundaria = @cor_secundaria,
      atualizado_em = datetime('now')
    WHERE id = @id
  `);

  stmt.run(atualizado);
  return obterLayout();
}

/**
 * Restaura todas as configurações de layout para o padrão oficial da UPA PET.
 */
function restaurarLayoutPadrao() {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE configuracoes_layout
    SET
      font_family = @font_family,
      font_size_body = @font_size_body,
      font_size_titulo = @font_size_titulo,
      margin_top = @margin_top,
      margin_bottom = @margin_bottom,
      margin_left = @margin_left,
      margin_right = @margin_right,
      line_height = @line_height,
      paragraph_spacing = @paragraph_spacing,
      cor_primaria = @cor_primaria,
      cor_secundaria = @cor_secundaria,
      atualizado_em = datetime('now')
    WHERE id = @id
  `);

  stmt.run(LAYOUT_PADRAO);
  return obterLayout();
}

/**
 * Converte strings CSS de medida para Twips (1/20 de ponto) utilizado na biblioteca docx.
 * Suporta 'mm' e 'pt'. Exemplo: '20mm' -> 1134 twips, '10pt' -> 200 twips.
 */
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
    // Por padrão assume mm se < 40, senão twips
    return num <= 40 ? Math.round(num * 56.6929) : Math.round(num);
  }

  return fallbackTwips;
}

/**
 * Converte valor de fonte em 'pt' para half-points da biblioteca docx (ex: '11pt' -> 22 half-points).
 */
function ptParaHalfPoints(valorStr, fallbackHalfPoints = 22) {
  if (!valorStr || typeof valorStr !== 'string') return fallbackHalfPoints;
  const match = valorStr.trim().match(/^([\d.]+)/);
  if (!match) return fallbackHalfPoints;
  const pt = parseFloat(match[1]);
  return isNaN(pt) ? fallbackHalfPoints : Math.round(pt * 2);
}

/**
 * Converte as configurações de layout do banco para os formatos aceitos pela biblioteca `docx`.
 */
function converterParaDocx(layout) {
  const cfg = layout || obterLayout();

  // Família da fonte principal (sem fallback CSS e sem aspas)
  const fontMatch = (cfg.font_family || 'Calibri').split(',')[0].replace(/['"]/g, '').trim();

  // Half-points (pt * 2)
  const szCorpo = ptParaHalfPoints(cfg.font_size_body, 22);
  const szTitulo = ptParaHalfPoints(cfg.font_size_titulo, 28);

  // Margens da página em twips
  const marginTop = medidaParaTwips(cfg.margin_top, 1134);
  const marginBottom = medidaParaTwips(cfg.margin_bottom, 1134);
  const marginLeft = medidaParaTwips(cfg.margin_left, 850);
  const marginRight = medidaParaTwips(cfg.margin_right, 850);

  // Espaçamentos
  // Na biblioteca docx: spacing.after é em twips (1 pt = 20 twips)
  const spacingAfter = medidaParaTwips(cfg.paragraph_spacing, 160);
  // line spacing no docx: 240 equivale a 1.0 (linha simples)
  const lineMultiplier = parseFloat(cfg.line_height) || 1.4;
  const lineSpacing = Math.round(lineMultiplier * 240);

  // Cores hexadecimais sem '#'
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
