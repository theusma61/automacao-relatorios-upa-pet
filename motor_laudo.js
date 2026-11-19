const fs = require('fs');
const path = require('path');
const os = require('os');
const { compilarPDF } = require('./compilador_pdf');
const { obterLayout } = require('./gerenciador_layout');
const { obterPerfilLaudo } = require('./gerenciador_perfil_laudo');
const {
  construirHtmlLaudo,
  calcularAutoFitLaudoTextual,
  normalizarOrgaosCanonica
} = require('./renderizador_layout_laudo');
const { normalizarRotuloResponsavel } = require('./extrator_padrao_laudo');

function lerImagemDataUri(caminhoImg) {
  if (!caminhoImg || !fs.existsSync(caminhoImg)) return '';
  const ext = path.extname(caminhoImg).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const b64 = fs.readFileSync(caminhoImg).toString('base64');
  return `data:${mime};base64,${b64}`;
}

function formatarNomeOrgaoCase(orgaoRaw, caseMode = 'UPPERCASE') {
  const limpo = String(orgaoRaw || '').replace(/:+$/, '').trim();
  if (!limpo) return '';
  if (caseMode === 'SENTENCE_CASE') {
    const lower = limpo.toLowerCase();
    if (limpo !== limpo.toUpperCase() && limpo !== limpo.toLowerCase()) {
      return limpo;
    }
    if (lower === 'alças intestinais' || lower === 'alcas intestinais') {
      return 'Alças Intestinais';
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return limpo.toUpperCase();
}

function sanitizarParagrafoOrgao(item, opcoesFormatacao = {}) {
  const caseMode = opcoesFormatacao.organLabelCase || 'UPPERCASE';
  const usarDiagDif = opcoesFormatacao.usarDiagDifSeparado !== false;
  const usarSubitensComTraco = Boolean(opcoesFormatacao.usarSubitensComTraco);
  const usarObsItalico = opcoesFormatacao.usarObsItalico !== false;

  const orgaoFormatado = formatarNomeOrgaoCase(item.orgao, caseMode);
  const regexOrgao = new RegExp(`^${String(item.orgao || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s-]*`, 'i');
  let textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();

  // Remove prefixos repetidos "DIAG DIF.: DIAG DIF.:" e cláusulas DIAG DIF. duplicadas em sequência
  textoLimpo = textoLimpo.replace(/(DIAG\s*DIF\.?\s*:\s*){2,}/gi, 'DIAG DIF.: ');
  textoLimpo = textoLimpo.replace(/(DIAG\s*DIF\.?\s*:\s*[^<\n]+?)\s+DIAG\s*DIF\.?\s*:\s*[^<\n]+$/gi, '$1');

  if (!usarDiagDif) {
    textoLimpo = textoLimpo.replace(/\s*DIAG\s*DIF\.?\s*:[^<\n]*$/gi, '').trim();
  }

  // Se o estilo do médico usa sub-itens com traço ("- Adrenal...", "- Duodeno:..."), garante quebra de linha antes de cada "- "
  if (usarSubitensComTraco) {
    textoLimpo = textoLimpo.replace(/([.:;])\s+(-\s+[A-ZÀ-Úa-zà-ú])/g, '$1\n$2');
  }
  // Garante quebra de linha antes de "Obs.:" quando aparece em linha própria no padrão do médico
  if (usarObsItalico) {
    textoLimpo = textoLimpo.replace(/([.!])\s+(Obs\.?:\s+)/g, '$1\n$2');
  }

  const linhas = textoLimpo.split(/\r?\n/);
  const linhasFormatadas = linhas.map((linha, idx) => {
    const lTrim = linha.trim();
    if (!lTrim) return '';
    if (idx > 0 && /^Obs\.?:/i.test(lTrim) && usarObsItalico) {
      return `<span class="obs-italic-line">${lTrim}</span>`;
    }
    let formatada = lTrim.replace(/\bOBS\s*:/g, '<strong>OBS:</strong>');
    if (usarDiagDif) {
      formatada = formatada.replace(/(DIAG\s*DIF\.?\s*:[^<\n]+)/gi, '<em>$1</em>');
    }
    return formatada;
  }).filter(Boolean);

  const textoFormatado = linhasFormatadas.join('<br>');

  let p = `<p><strong>${orgaoFormatado}:</strong> ${textoFormatado}`;

  if (usarDiagDif && item.diagDif && item.diagDif.trim() !== '') {
    const diagLimpo = item.diagDif.replace(/^(\s*DIAG\s*DIF\.?\s*:?\s*)+/i, '').trim();
    if (diagLimpo && !textoFormatado.toUpperCase().includes('DIAG DIF')) {
      p += ` <em>DIAG DIF.: ${diagLimpo}</em>`;
    }
  }

  p += `</p>`;
  return p;
}

function parseMmNumber(val, fallback) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  const m = String(val || '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : fallback;
}

/**
 * Renderiza o HTML 100% agnóstico fiel ao template extraído dos PDFs do médico veterinário.
 */
function gerarHtmlTemplateClonado(dadosPaciente, laudoArray, imagensPaths, layout, opcoes = {}) {
  const visual = layout.visual_config_json || {};
  const escrita = layout.writing_style_json || {};

  const pageBackgroundPath = layout.page_background_url || visual.pageBackgroundUrl || null;
  const headerBannerPath = layout.header_banner_url || visual.headerBannerUrl || null;
  const headerLogoPath = layout.header_logo_url || visual.headerLogoUrl || null;
  const sigPath = layout.assinatura_extraida_url || visual.assinaturaUrl || opcoes.usuario?.assinaturaUrl || null;
  const footerLogoPath = layout.footer_logo_url || visual.footerLogoUrl || null;

  const pageBackgroundUri = lerImagemDataUri(pageBackgroundPath);
  const headerBannerUri = lerImagemDataUri(headerBannerPath);
  const headerLogoUri = lerImagemDataUri(headerLogoPath);
  const sigUri = lerImagemDataUri(sigPath);
  const footerLogoUri = lerImagemDataUri(footerLogoPath);

  const ehStationeryFullPage = Boolean(
    pageBackgroundUri && (visual.stationeryMode === 'full_page_background' || !visual.stationeryMode)
  );
  const ehInlineLogoHeader = Boolean(
    !ehStationeryFullPage &&
    (visual.stationeryMode === 'inline_logo_header' || visual.headerMode === 'inline_logo_beside_patient') &&
    headerLogoUri
  );

  const margins = visual.margins || {
    topFirstPage: '20mm',
    topContinuationPages: '20mm',
    bottom: '20mm',
    left: '20mm',
    right: '20mm'
  };

  // Compatível tanto com patientHeader (novo formato agnóstico) quanto com patientGrid (legado)
  const pHeader = visual.patientHeader || visual.patientGrid || {
    layoutType: 'boxed_table',
    valueCase: 'TITLE_CASE',
    sexoAbreviado: false,
    bottomDivider: false,
    rows: [
      [
        { key: 'nome', label: 'Paciente:', widthPct: 75 },
        { key: 'data', label: 'Data:', widthPct: 25 }
      ],
      [
        { key: 'especie', label: 'Espécie:', widthPct: 25 },
        { key: 'raca', label: 'Raça:', widthPct: 31 },
        { key: 'sexo', label: 'Sexo:', widthPct: 16 },
        { key: 'idade', label: 'Idade:', widthPct: 28 }
      ],
      [{ key: 'tutor', label: 'Responsável:', widthPct: 100 }],
      [{ key: 'requisitante', label: 'Médico(a) Veterinário(a) Requisitante:', widthPct: 100 }]
    ]
  };

  const tCfg = visual.titleConfig || {
    showTextTitle: !ehStationeryFullPage,
    text: 'LAUDO ULTRASSONOGRÁFICO',
    subtitle: null,
    fontFamily: 'Calibri, Carlito, Arial, sans-serif',
    fontSize: '12pt',
    subtitleFontSize: '8pt',
    color: '#000000',
    bold: true,
    underline: false,
    alignment: 'center',
    marginTopMm: '5mm',
    marginBottomMm: '6mm'
  };

  const bTypo = visual.bodyTypography || {
    fontFamily: 'Calibri, Carlito, Arial, sans-serif',
    fontSize: '10.5pt',
    lineHeight: '1.35',
    paragraphSpacing: '10pt',
    textAlign: 'justify',
    organLabelCase: 'UPPERCASE',
    organLabelBold: true,
    paginationMode: 'two_page_flow',
    firstPageOrganCount: 8
  };

  const sCfg = visual.signatureConfig || {
    alignment: 'right',
    paddingRightMm: '0mm',
    marginTopMm: '10mm',
    hasTopLine: false,
    order: 'image_above_text',
    textLines: [],
    signatureImageHeightMm: '15mm'
  };

  const fCfg = visual.footerConfig || {
    showOnTextPages: ehStationeryFullPage ? 'baked_in_stationery' : 'all_text_pages',
    showOnImagePages: ehStationeryFullPage,
    disclaimerText: null,
    disclaimerFontFamily: 'Arial, Calibri, sans-serif',
    disclaimerFontSize: '8pt',
    disclaimerItalic: true,
    hasTopBorder: false,
    contactLines: [],
    showFooterLogo: Boolean(footerLogoUri)
  };

  const imgCfg = visual.imageGridConfig || {
    columns: 2,
    rowsPerPage: ehStationeryFullPage ? 3 : 4,
    colGapMm: ehStationeryFullPage ? '12.5mm' : '8mm',
    rowGapMm: ehStationeryFullPage ? '0mm' : '4mm',
    cardWidthMm: null,
    cardHeightMm: ehStationeryFullPage ? '56.5mm' : '56mm',
    border: 'none',
    pagePaddingTopMm: margins.topContinuationPages || '20mm',
    pagePaddingLeftMm: margins.left || '15mm',
    pagePaddingRightMm: margins.right || '15mm',
    pagePaddingSidesMm: margins.left || '15mm',
    centerLastOddImage: false
  };

  const formatarValorPaciente = (val, def = '', preservarDr = false) => {
    const v = String(val !== undefined && val !== null && val !== '' ? val : def).trim();
    if (preservarDr && /^dr\s*\(a\)$/i.test(v)) return 'Dr (a)';
    return pHeader.valueCase === 'UPPERCASE' ? v.toUpperCase() : v;
  };

  let sexoBruto = String(dadosPaciente.sexo || '').trim();
  if (pHeader.sexoAbreviado) {
    if (/^f/i.test(sexoBruto)) sexoBruto = 'F';
    else if (/^m/i.test(sexoBruto)) sexoBruto = 'M';
  }

  const mapaValoresPaciente = {
    data: formatarValorPaciente(dadosPaciente.data, ''),
    nome: formatarValorPaciente(dadosPaciente.nome || dadosPaciente.paciente, ''),
    sexo: formatarValorPaciente(sexoBruto, ''),
    especie: formatarValorPaciente(dadosPaciente.especie, pHeader.valueCase === 'UPPERCASE' ? 'CANINA' : 'Canina'),
    requisitante: formatarValorPaciente(dadosPaciente.requisitante, '', true),
    idade: formatarValorPaciente(dadosPaciente.idade, pHeader.valueCase === 'UPPERCASE' ? 'NÃO INFORMADA' : 'Não informada'),
    tutor: formatarValorPaciente(dadosPaciente.tutor || dadosPaciente.proprietario, ''),
    raca: formatarValorPaciente(dadosPaciente.raca, 'SRD')
  };

  const usarTabelaComBordas = pHeader.layoutType === 'boxed_table' && Array.isArray(pHeader.rows) && pHeader.rows.length > 0;
  const labelWrap = (lbl) => (pHeader.labelBold ? `<strong>${lbl}</strong>` : lbl);

  const colsPadrao = [
    [
      { key: 'nome', label: 'Nome:' },
      { key: 'especie', label: 'Espécie:' },
      { key: 'idade', label: 'Idade:' }
    ],
    [
      { key: 'tutor', label: 'Responsável:' },
      { key: 'sexo', label: 'Sexo:' },
      { key: 'data', label: 'Data:' }
    ]
  ];
  const colsEfetivas = (Array.isArray(pHeader.columns) && pHeader.columns.some(c => Array.isArray(c) && c.length > 0))
    ? pHeader.columns.filter(c => Array.isArray(c) && c.length > 0)
    : colsPadrao;

  const temDivisorInferior = pHeader.bottomDivider === true || (
    typeof pHeader.bottomDivider === 'object' && pHeader.bottomDivider !== null && pHeader.bottomDivider.enabled === true
  );

  let blocoPacienteHtml = '';
  let inlineHeaderHtml = '';
  let inlineHeaderHeightMm = 0;

  if (ehInlineLogoHeader) {
    const logoBox = visual.headerLogoBoxMm || { side: 'left', xMm: 6, yMm: 7, widthMm: 35, heightMm: 16 };
    const headerTopMm = pHeader.headerTopMm || 10;
    const headerBottomMm = pHeader.headerBottomMm || (headerTopMm + 12);
    const logoBottomMm = logoBox.yMm + logoBox.heightMm;
    inlineHeaderHeightMm = Number(Math.max(headerBottomMm + 3, logoBottomMm + 2).toFixed(1));

    const colPositions = Array.isArray(pHeader.colXPositionsMm) && pHeader.colXPositionsMm.length > 0
      ? pHeader.colXPositionsMm
      : (logoBox.side === 'left' ? [logoBox.xMm + logoBox.widthMm + 8, logoBox.xMm + logoBox.widthMm + 68] : [20, 82]);

    const colsPosHtml = colsEfetivas.map((col, idx) => {
      const xPos = colPositions[idx] !== undefined
        ? colPositions[idx]
        : (colPositions[0] + idx * 62);
      const linhas = col.map((campo) => {
        const val = mapaValoresPaciente[campo.key] ?? formatarValorPaciente(dadosPaciente[campo.key], campo.default || '');
        return `<p>${labelWrap(normalizarRotuloResponsavel(campo.label))} ${val}</p>`;
      }).join('\n');
      return `<div class="inline-patient-col" style="left: ${xPos}mm; top: ${headerTopMm}mm;">${linhas}</div>`;
    }).join('\n');

    inlineHeaderHtml = `
      <div class="inline-page-header" style="height: ${inlineHeaderHeightMm}mm;">
        <img src="${headerLogoUri}" class="inline-header-logo" style="left: ${logoBox.xMm}mm; top: ${logoBox.yMm}mm; width: ${logoBox.widthMm}mm; height: ${logoBox.heightMm}mm;" alt="Logo">
        ${colsPosHtml}
        ${temDivisorInferior ? `<div class="inline-header-divider" style="left: ${margins.left || '20mm'}; right: ${margins.right || '20mm'};"></div>` : ''}
      </div>
    `;
  } else if (usarTabelaComBordas) {
    const linhasTabelaHtml = pHeader.rows.map((rowCells) => {
      const celulasHtml = rowCells.map((cell) => {
        const val = mapaValoresPaciente[cell.key] ?? formatarValorPaciente(dadosPaciente[cell.key], '');
        const w = cell.widthPct || Math.floor(100 / Math.max(1, rowCells.length));
        return `<div class="patient-table-cell" style="width: ${w}%;"><strong>${normalizarRotuloResponsavel(cell.label)}</strong> ${val}</div>`;
      }).join('\n');
      return `<div class="patient-table-row">${celulasHtml}</div>`;
    }).join('\n');

    blocoPacienteHtml = `<div class="patient-boxed-table">${linhasTabelaHtml}</div>`;
  } else {
    const colunasHtml = colsEfetivas.map((col) => {
      const linhas = col.map((campo) => {
        const val = mapaValoresPaciente[campo.key] ?? formatarValorPaciente(dadosPaciente[campo.key], campo.default || '');
        return `<p>${labelWrap(normalizarRotuloResponsavel(campo.label))} ${val}</p>`;
      }).join('\n');
      return `<div class="patient-col">${linhas}</div>`;
    }).join('\n');

    blocoPacienteHtml = `
      <div class="patient-grid">
        ${colunasHtml}
      </div>
      ${temDivisorInferior ? `<hr class="patient-divider">` : ''}
    `;
  }

  const ehFemea = /^(f|f[eê]mea)/i.test(String(dadosPaciente.sexo || '').trim());
  const ehMacho = /^(m|macho)/i.test(String(dadosPaciente.sexo || '').trim()) && !ehFemea;

  const laudoFiltrado = (laudoArray || []).filter((item) => {
    const orgNorm = String(item.orgao || '').toUpperCase();
    if (escrita.omitirOrgaosSexoOposto !== false) {
      if (ehFemea && (orgNorm.includes('PROSTATA') || orgNorm.includes('PRÓSTATA') || orgNorm.includes('TESTICULO') || orgNorm.includes('TESTÍCULO'))) {
        return false;
      }
      if (ehMacho && (orgNorm.includes('UTERO') || orgNorm.includes('ÚTERO') || orgNorm.includes('OVARIO') || orgNorm.includes('OVÁRIO'))) {
        return false;
      }
    }
    if (escrita.usarTopicoConsideracoesSeparado === false && /CONSIDERA[CÇ][OÕ]ES/i.test(orgNorm)) {
      return false;
    }
    return true;
  });

  const laudoNormalizado = normalizarOrgaosCanonica(laudoFiltrado);
  const paragrafosOrgaos = laudoNormalizado.map((item) =>
    sanitizarParagrafoOrgao(item, {
      organLabelCase: bTypo.organLabelCase || 'UPPERCASE',
      usarDiagDifSeparado: escrita.usarDiagDifSeparado,
      usarSubitensComTraco: escrita.usarSubitensComTraco,
      usarObsItalico: escrita.usarObsItalico
    })
  );

  const cortePag1 = bTypo.firstPageOrganCount || 8;
  const usarDuasPaginasTexto = (
    bTypo.paginationMode === 'two_page_flow' || bTypo.paginationMode === 'two_page_ulsvet'
  ) && paragrafosOrgaos.length > cortePag1;

  const orgaosPag1 = usarDuasPaginasTexto ? paragrafosOrgaos.slice(0, cortePag1).join('\n') : paragrafosOrgaos.join('\n');
  const orgaosPag2 = usarDuasPaginasTexto ? paragrafosOrgaos.slice(cortePag1).join('\n') : '';

  const linhasAssinaturaConfig = (Array.isArray(sCfg.textLines) && sCfg.textLines.length > 0)
    ? sCfg.textLines
    : [
        ...(opcoes.nomeMedico ? [{ text: opcoes.nomeMedico, bold: true, italic: false }] : []),
        ...(opcoes.crmvMedico ? [{ text: opcoes.crmvMedico, bold: false, italic: false }] : [])
      ];

  const linhasAssinaturaTexto = linhasAssinaturaConfig.map((l) => {
    let conteudo = l.text || '';
    if (l.italic) conteudo = `<em>${conteudo}</em>`;
    if (l.bold) conteudo = `<strong>${conteudo}</strong>`;
    return `<p class="sig-line" ${l.fontSize ? `style="font-size: ${l.fontSize};"` : ''}>${conteudo}</p>`;
  }).join('\n');

  const imgAssinaturaHtml = sigUri
    ? `<div class="sig-img-wrap"><img src="${sigUri}" class="sig-img" alt="Assinatura"></div>`
    : '';
  const linhaAssinaturaHtml = sCfg.hasTopLine
    ? `<div class="sig-top-line"></div>`
    : '';

  const blocoAssinaturaHtml = `
    <div class="signature-block">
      <div class="signature-inner">
        ${sCfg.order === 'text_above_image'
          ? `${linhaAssinaturaHtml}\n${linhasAssinaturaTexto}\n${imgAssinaturaHtml}`
          : `${imgAssinaturaHtml}\n${linhaAssinaturaHtml}\n${linhasAssinaturaTexto}`}
      </div>
    </div>
  `;

  const mostrarRodapeHtmlNasPaginasTexto = !ehStationeryFullPage && fCfg.showOnTextPages !== 'baked_in_stationery';
  const mostrarRodapeEmTodasPaginasTexto = mostrarRodapeHtmlNasPaginasTexto && fCfg.showOnTextPages === 'all_text_pages';
  const mostrarRodapeNasPaginasImagem = !ehStationeryFullPage && Boolean(fCfg.showOnImagePages && fCfg.disclaimerText);

  const blocoDisclaimerRodapeFinalHtml = mostrarRodapeHtmlNasPaginasTexto ? `
    <div class="final-footer-wrap">
      ${fCfg.hasTopBorder ? `<div class="footer-top-border"></div>` : ''}
      ${fCfg.disclaimerText ? `<div class="disclaimer-text">${fCfg.disclaimerText}</div>` : ''}
      ${(fCfg.contactLines && fCfg.contactLines.length > 0) ? `
        <div class="contact-divider"></div>
        <div class="contact-lines">
          ${fCfg.contactLines.map(l => `<p>${l}</p>`).join('\n')}
        </div>
      ` : ''}
      ${(fCfg.showFooterLogo && footerLogoUri) ? `
        <div class="footer-mini-logo-wrap">
          <img src="${footerLogoUri}" class="footer-mini-logo" alt="Logo Rodapé">
        </div>
      ` : ''}
    </div>
  ` : '';

  const blocoRodapePag1Html = mostrarRodapeEmTodasPaginasTexto
    ? blocoDisclaimerRodapeFinalHtml
    : ((mostrarRodapeHtmlNasPaginasTexto && fCfg.showFooterLogo && footerLogoUri)
        ? `<div class="footer-mini-logo-wrap"><img src="${footerLogoUri}" class="footer-mini-logo" alt="Logo Rodapé"></div>`
        : '');

  const blocoRodapePagImagemHtml = mostrarRodapeNasPaginasImagem ? `
    <div class="final-footer-wrap">
      ${fCfg.hasTopBorder ? `<div class="footer-top-border"></div>` : ''}
      <div class="disclaimer-text">${fCfg.disclaimerText}</div>
    </div>
  ` : '';

  const mostrarTituloTexto = tCfg.showTextTitle !== false && Boolean(tCfg.text && String(tCfg.text).trim());
  const blocoTituloHtml = mostrarTituloTexto ? `
    <div class="report-title-box">
      <h1>${tCfg.text}</h1>
      ${tCfg.subtitle ? `<p class="report-subtitle">${tCfg.subtitle}</p>` : ''}
    </div>
  ` : '';

  const fotosPorPagina = (imgCfg.columns || 2) * (imgCfg.rowsPerPage || 3);
  const paginasImagens = [];
  for (let i = 0; i < imagensPaths.length; i += fotosPorPagina) {
    paginasImagens.push(imagensPaths.slice(i, i + fotosPorPagina));
  }

  const bgLayerPag1Html = ehStationeryFullPage
    ? `<img src="${pageBackgroundUri}" class="stationery-bg-img" alt="">`
    : '';
  const bgLayerPag2Html = (ehStationeryFullPage && visual.repeatHeaderOnTextPage2 !== false)
    ? `<img src="${pageBackgroundUri}" class="stationery-bg-img" alt="">`
    : '';
  const bgLayerPagFotosHtml = (ehStationeryFullPage && visual.repeatHeaderOnImagePages !== false)
    ? `<img src="${pageBackgroundUri}" class="stationery-bg-img" alt="">`
    : '';

  const repetirCabecalhoInlinePag2 = ehInlineLogoHeader && Boolean(visual.repeatPatientHeaderOnTextPages || visual.repeatHeaderOnTextPage2);
  const repetirCabecalhoInlineFotos = ehInlineLogoHeader && Boolean(visual.repeatPatientHeaderOnImagePages || visual.repeatHeaderOnImagePages);

  // Calcula padding-top efetivo do corpo abaixo do cabeçalho inline (quando houver)
  const titleMarginTopNum = parseMmNumber(tCfg.marginTopMm, 5);
  const paddingTopPag1 = ehStationeryFullPage
    ? (margins.topFirstPage || '50mm')
    : (ehInlineLogoHeader
        ? `${Math.max(2, titleMarginTopNum - 2)}mm`
        : (headerBannerUri ? '4mm' : (margins.topFirstPage || '20mm')));

  const topContNum = parseMmNumber(margins.topContinuationPages, 22);
  const paddingTopPag2 = repetirCabecalhoInlinePag2
    ? `${Math.max(3, Number((topContNum - inlineHeaderHeightMm).toFixed(1)))}mm`
    : (margins.topContinuationPages || '22mm');

  const imgTopNum = parseMmNumber(imgCfg.pagePaddingTopMm, 28);
  const paddingTopFotos = repetirCabecalhoInlineFotos
    ? `${Math.max(2, Number((imgTopNum - inlineHeaderHeightMm).toFixed(1)))}mm`
    : (imgCfg.pagePaddingTopMm || '28mm');

  const imgLeftPad = imgCfg.pagePaddingLeftMm || imgCfg.pagePaddingSidesMm || margins.left || '20mm';
  const imgRightPad = imgCfg.pagePaddingRightMm || imgCfg.pagePaddingSidesMm || margins.right || '20mm';
  const bottomPadMm = margins.bottom || '16mm';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Ultrassonografia - ${dadosPaciente.nome || 'Paciente'}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: ${bTypo.fontFamily || layout.font_family || 'Calibri, Carlito, Arial, sans-serif'};
      font-size: ${bTypo.fontSize || layout.font_size_body || '10pt'};
      line-height: ${bTypo.lineHeight || layout.line_height || '1.35'};
      color: #111;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .cloned-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      background: #fff;
    }
    .cloned-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .stationery-bg-img {
      position: absolute;
      inset: 0;
      width: 210mm;
      height: 297mm;
      object-fit: fill;
      z-index: 0;
      pointer-events: none;
    }
    .page-foreground {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Cabeçalho com logo posicionada ao lado dos dados do paciente */
    .inline-page-header {
      position: relative;
      width: 210mm;
      flex-shrink: 0;
    }
    .inline-header-logo {
      position: absolute;
      object-fit: contain;
      display: block;
    }
    .inline-patient-col {
      position: absolute;
      font-family: ${pHeader.fontFamily || 'Arial, Helvetica, sans-serif'};
      font-size: ${pHeader.fontSize || '10pt'};
      line-height: 1.28;
      color: #111;
      white-space: nowrap;
    }
    .inline-patient-col p {
      margin: 0;
    }
    .inline-header-divider {
      position: absolute;
      bottom: 0;
      border-bottom: 1px solid #000;
    }
    .full-bleed-banner {
      width: 100%;
      margin: 0;
      padding: 0;
      line-height: 0;
    }
    .full-bleed-banner img {
      width: 100%;
      height: auto;
      max-height: 52mm;
      object-fit: cover;
      display: block;
    }
    .page-1-body {
      padding: ${paddingTopPag1} ${margins.right || '20mm'} ${ehStationeryFullPage ? '30mm' : '4mm'} ${margins.left || '20mm'};
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .page-2-body {
      padding: ${paddingTopPag2} ${margins.right || '20mm'} 4mm ${margins.left || '20mm'};
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    /* Tabela de paciente com bordas ("separado com traços") */
    .patient-boxed-table {
      width: 100%;
      border-top: 1px solid #9E9E9E;
      border-left: 1px solid #9E9E9E;
      margin-bottom: 3.5mm;
      font-family: ${pHeader.fontFamily || bTypo.fontFamily || 'Calibri, Carlito, Arial, sans-serif'};
      font-size: ${pHeader.fontSize || '11pt'};
      line-height: 1.25;
      background: transparent;
    }
    .patient-table-row {
      display: flex;
      width: 100%;
    }
    .patient-table-cell {
      padding: 1.1mm 2mm;
      border-right: 1px solid #9E9E9E;
      border-bottom: 1px solid #9E9E9E;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Grade de paciente em 2 colunas sem bordas internas */
    .patient-grid {
      display: flex;
      justify-content: space-between;
      padding: 2mm 4mm 4mm 4mm;
      font-family: ${pHeader.fontFamily || bTypo.fontFamily || 'Calibri, Arial, sans-serif'};
      font-size: ${pHeader.fontSize || '10pt'};
      line-height: 1.35;
    }
    .patient-col {
      width: 48%;
    }
    .patient-col p {
      margin: 1.5px 0;
    }
    .patient-divider {
      border: none;
      border-top: 1px solid #000;
      margin: 0 0 ${tCfg.marginTopMm || '6mm'} 0;
    }
    .report-title-box {
      text-align: ${tCfg.alignment || 'center'};
      margin-bottom: ${tCfg.marginBottomMm || '6mm'};
    }
    .report-title-box h1 {
      font-family: ${tCfg.fontFamily || bTypo.fontFamily || 'Calibri, Carlito, Arial, sans-serif'};
      font-size: ${tCfg.fontSize || '12pt'};
      color: ${tCfg.color || '#000'};
      font-weight: ${tCfg.bold === false ? 'normal' : '600'};
      margin: 0;
      display: inline-block;
      ${tCfg.underline ? 'border-bottom: 1.2px solid #000; padding-bottom: 1px;' : ''}
    }
    .report-subtitle {
      font-family: ${tCfg.fontFamily || bTypo.fontFamily || 'Calibri, Carlito, Arial, sans-serif'};
      font-size: ${tCfg.subtitleFontSize || '8pt'};
      font-style: italic;
      color: #111;
      margin: 1.5mm auto 0 auto;
      line-height: 1.25;
      max-width: 162mm;
    }
    .organs-content {
      text-align: ${bTypo.textAlign || 'justify'};
      font-size: ${bTypo.fontSize || '10pt'};
      line-height: ${bTypo.lineHeight || '1.35'};
    }
    .organs-content p {
      margin: 0 0 ${bTypo.paragraphSpacing || '10pt'} 0;
    }
    .obs-italic-line {
      font-size: 8.5pt;
      font-style: italic;
      display: inline-block;
      line-height: 1.25;
    }
    .signature-block {
      display: flex;
      justify-content: ${sCfg.alignment === 'left' ? 'flex-start' : (sCfg.alignment === 'center' ? 'center' : 'flex-end')};
      padding-right: ${sCfg.alignment === 'right' ? (sCfg.paddingRightMm || '0mm') : '0'};
      margin-top: ${sCfg.marginTopMm || '8mm'};
    }
    .signature-inner {
      text-align: ${sCfg.alignment === 'right' ? 'right' : (sCfg.alignment === 'left' ? 'left' : 'center')};
      min-width: 45mm;
    }
    .sig-top-line {
      width: 56mm;
      border-top: 1px solid #333;
      margin: 0 0 2mm auto;
    }
    .sig-line {
      margin: 1px 0;
      font-size: 10pt;
      color: #111;
    }
    .sig-img-wrap {
      margin: 0 0 1mm 0;
      text-align: center;
    }
    .sig-img {
      height: ${sCfg.signatureImageHeightMm || '15mm'};
      width: auto;
      display: inline-block;
    }
    .final-footer-wrap {
      padding: 0 ${margins.right || '20mm'} ${bottomPadMm} ${margins.left || '20mm'};
      flex-shrink: 0;
    }
    .footer-top-border {
      border-top: 1px solid #bbb;
      margin-bottom: 2mm;
    }
    .disclaimer-text {
      font-family: ${fCfg.disclaimerFontFamily || 'Arial, Calibri, sans-serif'};
      font-size: ${fCfg.disclaimerFontSize || '8pt'};
      font-style: ${fCfg.disclaimerItalic === false ? 'normal' : 'italic'};
      line-height: 1.25;
      text-align: center;
      color: #111;
      max-width: 175mm;
      margin: 0 auto;
    }
    .contact-divider {
      border-top: 1px ${fCfg.dividerStyle && fCfg.dividerStyle !== 'none' ? fCfg.dividerStyle : 'dashed'} #222;
      margin: 2mm 2mm 2mm 2mm;
    }
    .contact-lines {
      font-family: ${fCfg.contactFontFamily || 'Calibri, sans-serif'};
      font-size: ${fCfg.contactFontSize || '8.5pt'};
      text-align: center;
      line-height: 1.3;
      margin-bottom: 2mm;
    }
    .contact-lines p {
      margin: 1px 0;
    }
    .footer-mini-logo-wrap {
      text-align: center;
      padding-bottom: 2mm;
    }
    .footer-mini-logo {
      height: 9.5mm;
      width: auto;
      display: inline-block;
    }
    .image-page-body {
      padding: ${paddingTopFotos} ${imgRightPad} 4mm ${imgLeftPad};
      flex: 1;
    }
    .ultrasound-grid {
      display: grid;
      grid-template-columns: repeat(${imgCfg.columns || 2}, minmax(0, 1fr));
      column-gap: ${imgCfg.colGapMm || '10mm'};
      row-gap: ${imgCfg.rowGapMm || '4mm'};
      align-content: start;
      width: 100%;
    }
    .ultrasound-grid.single-centered {
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .ultrasound-grid.single-centered .ultrasound-cell {
      width: ${imgCfg.cardWidthMm || '75mm'};
    }
    .ultrasound-cell {
      background: #000;
      height: ${imgCfg.cardHeightMm || '56.2mm'};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: ${imgCfg.border || 'none'};
    }
    .ultrasound-cell img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body data-page-fill="natural">
  <!-- PÁGINA 1 -->
  <div class="cloned-page">
    ${bgLayerPag1Html}
    <div class="page-foreground">
      <div>
        ${ehInlineLogoHeader ? inlineHeaderHtml : ''}
        ${(!ehStationeryFullPage && !ehInlineLogoHeader && headerBannerUri) ? `<div class="full-bleed-banner"><img src="${headerBannerUri}" alt="Cabeçalho"></div>` : ''}
        <div class="page-1-body">
          ${!ehInlineLogoHeader ? blocoPacienteHtml : ''}
          ${blocoTituloHtml}
          <div class="organs-content">
            ${orgaosPag1}
          </div>
          ${!usarDuasPaginasTexto ? blocoAssinaturaHtml : ''}
        </div>
      </div>
      ${usarDuasPaginasTexto ? blocoRodapePag1Html : blocoDisclaimerRodapeFinalHtml}
    </div>
  </div>

  <!-- PÁGINA 2 DE TEXTO -->
  ${usarDuasPaginasTexto ? `
  <div class="cloned-page">
    ${bgLayerPag2Html}
    <div class="page-foreground">
      <div>
        ${repetirCabecalhoInlinePag2 ? inlineHeaderHtml : ''}
        <div class="page-2-body">
          <div class="organs-content">
            ${orgaosPag2}
          </div>
          ${blocoAssinaturaHtml}
        </div>
      </div>
      ${blocoDisclaimerRodapeFinalHtml}
    </div>
  </div>
  ` : ''}

  <!-- PÁGINAS SEGUINTES: MOSAICO DE FOTOS DE ULTRASSOM -->
  ${paginasImagens.map((fotos) => {
    const ehUnicaCentralizada = fotos.length === 1 && Boolean(imgCfg.centerLastOddImage);
    return `
  <div class="cloned-page">
    ${bgLayerPagFotosHtml}
    <div class="page-foreground">
      <div>
        ${repetirCabecalhoInlineFotos ? inlineHeaderHtml : ''}
        <div class="image-page-body">
          <div class="ultrasound-grid${ehUnicaCentralizada ? ' single-centered' : ''}">
            ${fotos.map((fotoPath) => {
              const srcUri = fotoPath.startsWith('data:')
                ? fotoPath
                : lerImagemDataUri(fotoPath);
              return `<div class="ultrasound-cell"><img src="${srcUri}" alt="Ultrassom"></div>`;
            }).join('\n')}
          </div>
        </div>
      </div>
      ${blocoRodapePagImagemHtml}
    </div>
  </div>
  `;
  }).join('\n')}
</body>
</html>`;
}

async function gerarDocumentosExame(dadosPaciente, laudoArray, imagensPaths, pastaSaida, customLayout = null, opcoes = {}) {
  const { obterLayout } = require('./gerenciador_layout');
  const { gerarDocxLaudo } = require('./gerar_docx');

  const usuario = opcoes.usuario || {};

  let perfilLaudo = opcoes.perfilLaudo || null;
  if (!perfilLaudo && usuario?.id) {
    try {
      perfilLaudo = await obterPerfilLaudo(usuario.id);
    } catch (_) {}
  }

  const layout = customLayout || await obterLayout(usuario.id || null);
  const nomeSanitizado = (dadosPaciente.nome || 'Paciente').replace(/[^a-zA-Z0-9_-]/g, '_');

  const nomeMedico = opcoes.nomeMedico || perfilLaudo?.nomeDetectado || usuario.nome || 'Médico(a) Veterinário(a)';
  const crmvMedico = opcoes.crmvMedico || perfilLaudo?.crmvDetectado || usuario.crmv || '';
  const clinicaNome = opcoes.clinicaNome || perfilLaudo?.clinicaDetectada || usuario.nomeClinica || 'Vetaro';

  // Suporta tanto ConfiguracaoLayout clonado quanto visualConfigClonado embutido no PerfilLaudo
  const visualClonadoPerfil = perfilLaudo?.templateVisual?.visualConfigClonado || null;
  const layoutEfetivo = (!layout?.visual_config_json && visualClonadoPerfil)
    ? {
        ...layout,
        modo_template: 'clonado_pdf',
        visual_config_json: visualClonadoPerfil,
        writing_style_json: perfilLaudo?.templateVisual?.writingStyleClonado || layout?.writing_style_json || null,
        page_background_url: visualClonadoPerfil.pageBackgroundUrl || layout?.page_background_url || null,
        header_banner_url: visualClonadoPerfil.headerBannerUrl || layout?.header_banner_url || null,
        header_logo_url: visualClonadoPerfil.headerLogoUrl || layout?.header_logo_url || null,
        footer_logo_url: visualClonadoPerfil.footerLogoUrl || layout?.footer_logo_url || null,
        assinatura_extraida_url: visualClonadoPerfil.assinaturaUrl || layout?.assinatura_extraida_url || null
      }
    : layout;

  const usarModoClonado = Boolean(
    layoutEfetivo?.modo_template === 'clonado_pdf' ||
    layoutEfetivo?.visual_config_json ||
    opcoes.forcarTemplateClonado
  );

  let html = '';

  if (usarModoClonado) {
    html = gerarHtmlTemplateClonado(dadosPaciente, laudoArray, imagensPaths, layoutEfetivo, {
      usuario,
      nomeMedico,
      crmvMedico,
      clinicaNome
    });
  } else if (perfilLaudo && perfilLaudo.ativo && perfilLaudo.templateVisual) {
    html = construirHtmlLaudo(dadosPaciente, laudoArray, imagensPaths, {
      usuario,
      perfilLaudo,
      customLayout: layout,
      nomeMedico,
      crmvMedico,
      clinicaNome
    });
  } else {
    // Modo Padrão Vetaro (sem logo nem referência a UPA PET)
    const caminhoLogoEfetivo = (usuario.logoUrl && fs.existsSync(usuario.logoUrl))
      ? usuario.logoUrl
      : null;

    const logoBase64 = (caminhoLogoEfetivo && fs.existsSync(caminhoLogoEfetivo))
      ? fs.readFileSync(caminhoLogoEfetivo).toString('base64')
      : '';
    const logoMime = caminhoLogoEfetivo && path.extname(caminhoLogoEfetivo).toLowerCase() === '.png'
      ? 'image/png'
      : 'image/jpeg';

    let assinaturaImgHtml = '';
    if (usuario.assinaturaUrl && fs.existsSync(usuario.assinaturaUrl)) {
      const assExt = path.extname(usuario.assinaturaUrl).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      const assBase64 = fs.readFileSync(usuario.assinaturaUrl).toString('base64');
      assinaturaImgHtml = `<img src="data:${assExt};base64,${assBase64}" style="max-height:42px; display:inline-block; margin-bottom:2px;" alt="Assinatura"><br>`;
    }

    const paginasImagens = [];
    for (let i = 0; i < imagensPaths.length; i += 8) {
      paginasImagens.push(imagensPaths.slice(i, i + 8));
    }

    const cabecalho = `
      <div class="header">
        ${logoBase64 ? `
          <div class="logo-box">
            <img src="data:${logoMime};base64,${logoBase64}" class="logo-img" alt="${clinicaNome}">
          </div>
        ` : ''}
        <div class="patient-info" style="${logoBase64 ? 'margin-left: 15px;' : 'margin-left: 0;'}">
          <div class="col">
            <p><strong>Nome:</strong> <span contenteditable="true">${dadosPaciente.nome || ''}</span></p>
            <p><strong>Espécie:</strong> <span contenteditable="true">${dadosPaciente.especie || ''}</span></p>
            <p><strong>Idade:</strong> <span contenteditable="true">${dadosPaciente.idade || 'Não informada'}</span></p>
          </div>
          <div class="col">
            <p><strong>Responsável:</strong> <span contenteditable="true">${dadosPaciente.tutor || ''}</span></p>
            <p><strong>Sexo:</strong> <span contenteditable="true">${dadosPaciente.sexo || ''}</span></p>
            <p><strong>Data:</strong> <span contenteditable="true">${dadosPaciente.data || ''}</span></p>
          </div>
        </div>
      </div>
    `;

    const autoFit = calcularAutoFitLaudoTextual(laudoArray, layout, opcoes);
    const laudoProcessado = autoFit.laudoAjustado;

    const rodape = `
      <div class="footer">
        O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.
      </div>
    `;

    const laudoTextoHTML = laudoProcessado.map(item =>
      sanitizarParagrafoOrgao(item, { organLabelCase: 'UPPERCASE', usarDiagDifSeparado: true })
    ).join('\n');

    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Ultrassonografia - ${dadosPaciente.nome}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    body {
      font-family: ${layout.font_family};
      font-size: ${autoFit.fontSizeBody};
      line-height: ${autoFit.lineHeight};
      color: #111;
      margin: 0;
      padding: 0;
      background-color: #f0f2f5;
    }
    .page-container {
      width: 210mm;
      height: 297mm;
      margin: 20px auto;
      background: white;
      padding: ${autoFit.marginTop} ${layout.margin_right || '15mm'} ${autoFit.marginBottom} ${layout.margin_left || '15mm'};
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
    }
    @media print {
      body { background: transparent; }
      .page-container {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: ${autoFit.marginTop} ${layout.margin_right || '15mm'} ${autoFit.marginBottom} ${layout.margin_left || '15mm'} !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
    }
    .header { display: flex; align-items: center; margin-bottom: ${autoFit.marginHeaderBottom}; border-bottom: 1px solid #d1d5db; padding-bottom: ${autoFit.paddingHeaderBottom}; }
    .logo-box { width: 140px; display: flex; align-items: center; }
    .logo-img { max-width: 130px; max-height: ${autoFit.logoMaxHeight}; object-fit: contain; }
    .patient-info { flex: 1; display: flex; justify-content: space-between; font-size: 10pt; }
    .patient-info .col { width: 48%; }
    .patient-info .col p { margin: 1.5px 0; }
    .title-box { text-align: center; margin: ${autoFit.marginTitleBox}; }
    .title-box h1 { font-size: ${autoFit.fontSizeTitulo}; font-weight: bold; margin: 0; letter-spacing: 0.3px; color: ${layout.cor_primaria}; }
    .title-box p { font-size: ${autoFit.subtitleFontSize}; font-style: italic; margin: 2px 0 0 0; color: ${layout.cor_secundaria}; }
    .content { flex: 1; text-align: justify; font-size: ${autoFit.fontSizeBody}; line-height: ${autoFit.lineHeight}; outline: none; }
    .content p { margin: 0 0 ${autoFit.paragraphSpacing} 0; }
    .content p:last-child { margin-bottom: 0; }
    .signature { text-align: right; margin-top: ${autoFit.marginSignatureTop}; padding-right: 15px; }
    .signature p { margin: 1px 0; font-size: 9.5pt; }
    .footer { font-size: 7.2pt; font-style: italic; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 3px; margin-top: 3px; }
    .image-grid { display: grid; grid-template-columns: 1fr 1fr; grid-gap: 6px; flex: 1; margin-top: 6px; align-content: start; }
    .img-card { border: 1px solid #222; background: #000; display: flex; align-items: center; justify-content: center; height: 52mm; overflow: hidden; }
    .img-card img { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <div class="page-container">
    <div>
      ${cabecalho}
      <div class="title-box">
        <h1>RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL</h1>
        <p>Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo</p>
      </div>
      <div class="content" contenteditable="true" spellcheck="false">
        ${laudoTextoHTML}
      </div>
    </div>
    <div>
      <div class="signature">
        ${assinaturaImgHtml}
        <p><strong>${nomeMedico}</strong></p>
        ${crmvMedico ? `<p>${crmvMedico}</p>` : ''}
      </div>
      ${rodape}
    </div>
  </div>

  ${paginasImagens.map((fotos) => `
    <div class="page-container">
      <div>
        ${cabecalho}
        <div class="image-grid">
          ${fotos.map(foto => `
            <div class="img-card">
              <img src="${foto}" alt="Captura Ultrassom">
            </div>
          `).join('')}
        </div>
      </div>
      ${rodape}
    </div>
  `).join('')}
</body>
</html>`;
  }

  const caminhoHtmlTemp = path.join(os.tmpdir(), `laudo_temp_${Date.now()}_${nomeSanitizado}.html`);
  const caminhoPdf = path.join(pastaSaida, `Laudo_${nomeSanitizado}.pdf`);
  const caminhoDocx = path.join(pastaSaida, `Laudo_${nomeSanitizado}.docx`);

  fs.writeFileSync(caminhoHtmlTemp, html, 'utf8');
  await compilarPDF(caminhoHtmlTemp, caminhoPdf);

  try {
    fs.unlinkSync(caminhoHtmlTemp);
  } catch (e) {}

  const caminhoHtmlAntigo = path.join(pastaSaida, `Laudo_${nomeSanitizado}.html`);
  if (fs.existsSync(caminhoHtmlAntigo)) {
    try {
      fs.unlinkSync(caminhoHtmlAntigo);
    } catch (e) {}
  }

  const caminhoLogoEfetivo = (layoutEfetivo?.header_logo_url && fs.existsSync(layoutEfetivo.header_logo_url))
    ? layoutEfetivo.header_logo_url
    : ((usuario.logoUrl && fs.existsSync(usuario.logoUrl)) ? usuario.logoUrl : null);
  const templateVisual = perfilLaudo?.templateVisual || layoutEfetivo?.visual_config_json || {};

  await gerarDocxLaudo(dadosPaciente, laudoArray, caminhoDocx, caminhoLogoEfetivo, imagensPaths, layoutEfetivo, {
    usuario,
    nomeMedico,
    crmvMedico,
    clinicaNome,
    perfilLaudo,
    templateVisual,
    assinaturaPath: layoutEfetivo?.assinatura_extraida_url || usuario.assinaturaUrl || null
  });

  return { caminhoPdf, caminhoDocx };
}

module.exports = {
  gerarDocumentosExame,
  gerarHtmlTemplateClonado,
  sanitizarParagrafoOrgao,
  formatarNomeOrgaoCase
};
