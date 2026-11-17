const fs = require('fs');
const path = require('path');
const os = require('os');
const { compilarPDF } = require('./compilador_pdf');
const { obterLayout } = require('./gerenciador_layout');
const { obterPerfilLaudo } = require('./gerenciador_perfil_laudo');
const { construirHtmlLaudo } = require('./renderizador_layout_laudo');

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
    return lTrim.replace(/\bOBS\s*:/g, '<strong>OBS:</strong>');
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

/**
 * Renderiza o HTML 100% agnóstico fiel ao template extraído dos PDFs do médico veterinário.
 */
function gerarHtmlTemplateClonado(dadosPaciente, laudoArray, imagensPaths, layout, opcoes = {}) {
  const visual = layout.visual_config_json || {};
  const escrita = layout.writing_style_json || {};

  const pageBackgroundPath = layout.page_background_url || visual.pageBackgroundUrl || null;
  const headerBannerPath = layout.header_banner_url || null;
  const sigPath = layout.assinatura_extraida_url || opcoes.usuario?.assinaturaUrl || null;
  const footerLogoPath = layout.footer_logo_url || null;

  const pageBackgroundUri = lerImagemDataUri(pageBackgroundPath);
  const headerBannerUri = lerImagemDataUri(headerBannerPath);
  const sigUri = lerImagemDataUri(sigPath);
  const footerLogoUri = lerImagemDataUri(footerLogoPath);

  const ehStationeryFullPage = Boolean(
    pageBackgroundUri && (visual.stationeryMode === 'full_page_background' || !visual.stationeryMode)
  );

  const margins = visual.margins || {
    topFirstPage: '20mm',
    topContinuationPages: '20mm',
    bottom: '20mm',
    left: '15mm',
    right: '15mm'
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
      [{ key: 'tutor', label: 'Tutor(a):', widthPct: 100 }],
      [{ key: 'requisitante', label: 'Médico(a) Veterinário(a) Requisitante:', widthPct: 100 }]
    ]
  };

  const tCfg = visual.titleConfig || {
    showTextTitle: !ehStationeryFullPage,
    text: 'LAUDO ULTRASSONOGRÁFICO',
    fontFamily: 'Calibri, Arial, sans-serif',
    fontSize: '11pt',
    color: '#000000',
    bold: true,
    underline: false,
    alignment: 'center',
    marginTopMm: '5mm',
    marginBottomMm: '6mm'
  };

  const bTypo = visual.bodyTypography || {
    fontFamily: 'Calibri, Carlito, Arial, sans-serif',
    fontSize: '11pt',
    lineHeight: '1.4',
    paragraphSpacing: '8pt',
    textAlign: 'justify',
    organLabelCase: 'UPPERCASE',
    organLabelBold: true,
    paginationMode: 'two_page_flow',
    firstPageOrganCount: 8
  };

  const sCfg = visual.signatureConfig || {
    alignment: 'center',
    paddingRightMm: '0mm',
    marginTopMm: '12mm',
    order: 'image_above_text',
    textLines: [],
    signatureImageHeightMm: '14mm'
  };

  const fCfg = visual.footerConfig || {
    showOnTextPages: ehStationeryFullPage ? 'baked_in_stationery' : 'last_text_page_disclaimer_all_text_pages_logo',
    showOnImagePages: ehStationeryFullPage,
    disclaimerText: null,
    contactLines: [],
    showFooterLogo: Boolean(footerLogoUri)
  };

  const imgCfg = visual.imageGridConfig || {
    columns: 2,
    rowsPerPage: ehStationeryFullPage ? 3 : 4,
    colGapMm: ehStationeryFullPage ? '12.5mm' : '1mm',
    rowGapMm: ehStationeryFullPage ? '0mm' : '1mm',
    cardHeightMm: ehStationeryFullPage ? '56.5mm' : '64mm',
    border: 'none',
    pagePaddingTopMm: margins.topContinuationPages || '20mm',
    pagePaddingSidesMm: margins.left || '15mm'
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

  let blocoPacienteHtml = '';
  if (usarTabelaComBordas) {
    const linhasTabelaHtml = pHeader.rows.map((rowCells) => {
      const celulasHtml = rowCells.map((cell) => {
        const val = mapaValoresPaciente[cell.key] ?? formatarValorPaciente(dadosPaciente[cell.key], '');
        const w = cell.widthPct || Math.floor(100 / Math.max(1, rowCells.length));
        return `<div class="patient-table-cell" style="width: ${w}%;"><strong>${cell.label}</strong> ${val}</div>`;
      }).join('\n');
      return `<div class="patient-table-row">${celulasHtml}</div>`;
    }).join('\n');

    blocoPacienteHtml = `<div class="patient-boxed-table">${linhasTabelaHtml}</div>`;
  } else {
    const cols = Array.isArray(pHeader.columns) && pHeader.columns.length > 0
      ? pHeader.columns
      : [
          [
            { key: 'data', label: 'Data:' },
            { key: 'nome', label: 'Paciente:' },
            { key: 'sexo', label: 'Sexo:' },
            { key: 'especie', label: 'Espécie:' },
            { key: 'requisitante', label: 'Requisitante:' }
          ],
          [
            { key: 'idade', label: 'Idade:' },
            { key: 'tutor', label: 'Tutor(a):' },
            { key: 'raca', label: 'Raça:' }
          ]
        ];

    const colunasHtml = cols.map((col) => {
      const linhas = col.map((campo) => {
        const val = mapaValoresPaciente[campo.key] ?? formatarValorPaciente(dadosPaciente[campo.key], campo.default || '');
        return `<p><strong>${campo.label}</strong> ${val}</p>`;
      }).join('\n');
      return `<div class="patient-col">${linhas}</div>`;
    }).join('\n');

    const temDivisorInferior = pHeader.bottomDivider !== false && (
      typeof pHeader.bottomDivider === 'boolean' ? pHeader.bottomDivider : pHeader.bottomDivider?.enabled !== false
    );

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

  const paragrafosOrgaos = laudoFiltrado.map((item) =>
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
    return `<p class="sig-line">${conteudo}</p>`;
  }).join('\n');

  const imgAssinaturaHtml = sigUri
    ? `<div class="sig-img-wrap"><img src="${sigUri}" class="sig-img" alt="Assinatura"></div>`
    : '';

  const blocoAssinaturaHtml = `
    <div class="signature-block">
      <div class="signature-inner">
        ${sCfg.order === 'text_above_image'
          ? `${linhasAssinaturaTexto}\n${imgAssinaturaHtml}`
          : `${imgAssinaturaHtml}\n${linhasAssinaturaTexto}`}
      </div>
    </div>
  `;

  const mostrarRodapeHtmlNasPaginasTexto = !ehStationeryFullPage && fCfg.showOnTextPages !== 'baked_in_stationery';

  const blocoDisclaimerRodapeFinalHtml = mostrarRodapeHtmlNasPaginasTexto ? `
    <div class="final-footer-wrap">
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

  const blocoMiniLogoPag1Html = (mostrarRodapeHtmlNasPaginasTexto && fCfg.showFooterLogo && footerLogoUri)
    ? `<div class="footer-mini-logo-wrap"><img src="${footerLogoUri}" class="footer-mini-logo" alt="Logo Rodapé"></div>`
    : '';

  const mostrarTituloTexto = tCfg.showTextTitle !== false && Boolean(tCfg.text && String(tCfg.text).trim());
  const blocoTituloHtml = mostrarTituloTexto ? `
    <div class="report-title-box">
      <h1>${tCfg.text}</h1>
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

  const paddingTopPag1 = ehStationeryFullPage
    ? (margins.topFirstPage || '50mm')
    : (headerBannerUri ? '4mm' : (margins.topFirstPage || '20mm'));

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
      font-size: ${bTypo.fontSize || layout.font_size_body || '11pt'};
      line-height: ${bTypo.lineHeight || layout.line_height || '1.4'};
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
      padding: ${paddingTopPag1} ${margins.right || '20mm'} ${ehStationeryFullPage ? '30mm' : (margins.bottom || '24mm')} ${margins.left || '20mm'};
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .page-2-body {
      padding: ${margins.topContinuationPages || '22mm'} ${margins.right || '20mm'} ${margins.bottom || '24mm'} ${margins.left || '20mm'};
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
      font-family: ${bTypo.fontFamily || 'Calibri, Carlito, Arial, sans-serif'};
      font-size: 11pt;
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
      font-family: ${bTypo.fontFamily || 'Calibri, Arial, sans-serif'};
      font-size: 11pt;
      line-height: 1.42;
    }
    .patient-col {
      width: 48%;
    }
    .patient-col p {
      margin: 2px 0;
    }
    .patient-divider {
      border: none;
      border-top: 1px solid #000;
      margin: 0 0 ${tCfg.marginTopMm || '6mm'} 0;
    }
    .report-title-box {
      text-align: ${tCfg.alignment || 'center'};
      margin-bottom: ${tCfg.marginBottomMm || '8mm'};
    }
    .report-title-box h1 {
      font-family: ${tCfg.fontFamily || 'Calibri, Arial, sans-serif'};
      font-size: ${tCfg.fontSize || '11pt'};
      color: ${tCfg.color || '#000'};
      font-weight: bold;
      margin: 0;
      display: inline-block;
      ${tCfg.underline ? 'border-bottom: 1.2px solid #000; padding-bottom: 1px;' : ''}
    }
    .organs-content {
      text-align: ${bTypo.textAlign || 'justify'};
      font-size: ${bTypo.fontSize || '11pt'};
      line-height: ${bTypo.lineHeight || '1.4'};
    }
    .organs-content p {
      margin: 0 0 ${bTypo.paragraphSpacing || '8pt'} 0;
    }
    .obs-italic-line {
      font-size: 8.5pt;
      font-style: italic;
      display: inline-block;
      line-height: 1.25;
    }
    .signature-block {
      display: flex;
      justify-content: ${sCfg.alignment === 'center' ? 'center' : 'flex-end'};
      padding-right: ${sCfg.alignment === 'center' ? '0' : (sCfg.paddingRightMm || '22mm')};
      margin-top: ${sCfg.marginTopMm || '14mm'};
    }
    .signature-inner {
      text-align: center;
      min-width: 65mm;
    }
    .sig-line {
      margin: 1px 0;
      font-size: 11pt;
    }
    .sig-img-wrap {
      margin: 2px 0;
    }
    .sig-img {
      height: ${sCfg.signatureImageHeightMm || '13mm'};
      width: auto;
      display: inline-block;
    }
    .final-footer-wrap {
      padding: 0 ${margins.right || '15mm'} 3mm ${margins.left || '15mm'};
    }
    .disclaimer-text {
      font-family: ${fCfg.disclaimerFontFamily || 'Calibri, sans-serif'};
      font-size: ${fCfg.disclaimerFontSize || '8.5pt'};
      line-height: 1.35;
      text-align: center;
      color: #111;
      max-width: 175mm;
      margin: 0 auto 3mm auto;
    }
    .contact-divider {
      border-top: 1px ${fCfg.dividerStyle || 'dashed'} #222;
      margin: 0 2mm 2mm 2mm;
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
      padding: ${imgCfg.pagePaddingTopMm || '50mm'} ${imgCfg.pagePaddingSidesMm || '20mm'} ${margins.bottom || '24mm'} ${imgCfg.pagePaddingSidesMm || '20mm'};
      flex: 1;
    }
    .ultrasound-grid {
      display: grid;
      grid-template-columns: repeat(${imgCfg.columns || 2}, 1fr);
      column-gap: ${imgCfg.colGapMm || '10mm'};
      row-gap: ${imgCfg.rowGapMm || '0mm'};
      align-content: start;
    }
    .ultrasound-cell {
      background: #000;
      height: ${imgCfg.cardHeightMm || '56.5mm'};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: ${imgCfg.border || 'none'};
    }
    .ultrasound-cell img {
      width: 100%;
      height: 100%;
      object-fit: fill;
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
        ${(!ehStationeryFullPage && headerBannerUri) ? `<div class="full-bleed-banner"><img src="${headerBannerUri}" alt="Cabeçalho"></div>` : ''}
        <div class="page-1-body">
          ${blocoPacienteHtml}
          ${blocoTituloHtml}
          <div class="organs-content">
            ${orgaosPag1}
          </div>
          ${!usarDuasPaginasTexto ? blocoAssinaturaHtml : ''}
        </div>
      </div>
      ${usarDuasPaginasTexto ? blocoMiniLogoPag1Html : blocoDisclaimerRodapeFinalHtml}
    </div>
  </div>

  <!-- PÁGINA 2 DE TEXTO -->
  ${usarDuasPaginasTexto ? `
  <div class="cloned-page">
    ${bgLayerPag2Html}
    <div class="page-foreground">
      <div class="page-2-body">
        <div class="organs-content">
          ${orgaosPag2}
        </div>
        ${blocoAssinaturaHtml}
      </div>
      ${blocoDisclaimerRodapeFinalHtml}
    </div>
  </div>
  ` : ''}

  <!-- PÁGINAS SEGUINTES: MOSAICO DE FOTOS DE ULTRASSOM -->
  ${paginasImagens.map((fotos) => `
  <div class="cloned-page">
    ${bgLayerPagFotosHtml}
    <div class="page-foreground">
      <div class="image-page-body">
        <div class="ultrasound-grid">
          ${fotos.map((fotoPath) => {
            const srcUri = fotoPath.startsWith('data:')
              ? fotoPath
              : lerImagemDataUri(fotoPath);
            return `<div class="ultrasound-cell"><img src="${srcUri}" alt="Ultrassom"></div>`;
          }).join('\n')}
        </div>
      </div>
    </div>
  </div>
  `).join('\n')}
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

  const usarModoClonado = Boolean(
    layout?.modo_template === 'clonado_pdf' ||
    layout?.visual_config_json ||
    opcoes.forcarTemplateClonado
  );

  let html = '';

  if (usarModoClonado) {
    html = gerarHtmlTemplateClonado(dadosPaciente, laudoArray, imagensPaths, layout, {
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
            <p><strong>Tutor:</strong> <span contenteditable="true">${dadosPaciente.tutor || ''}</span></p>
            <p><strong>Sexo:</strong> <span contenteditable="true">${dadosPaciente.sexo || ''}</span></p>
            <p><strong>Data:</strong> <span contenteditable="true">${dadosPaciente.data || ''}</span></p>
          </div>
        </div>
      </div>
    `;

    const rodape = `
      <div class="footer">
        O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.
      </div>
    `;

    const laudoTextoHTML = laudoArray.map(item =>
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
      font-size: ${layout.font_size_body};
      line-height: ${layout.line_height};
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
      padding: ${layout.margin_top} ${layout.margin_right} ${layout.margin_bottom} ${layout.margin_left};
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    @media print {
      body { background: transparent; }
      .page-container {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: ${layout.margin_top} ${layout.margin_right} ${layout.margin_bottom} ${layout.margin_left} !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    .header { display: flex; align-items: center; margin-bottom: 4px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    .logo-box { width: 140px; display: flex; align-items: center; }
    .logo-img { max-width: 130px; max-height: 52px; object-fit: contain; }
    .patient-info { flex: 1; display: flex; justify-content: space-between; font-size: 10pt; }
    .patient-info .col { width: 48%; }
    .patient-info .col p { margin: 1.5px 0; }
    .title-box { text-align: center; margin-top: 8px; margin-bottom: 8px; }
    .title-box h1 { font-size: ${layout.font_size_titulo}; font-weight: bold; margin: 0; letter-spacing: 0.3px; color: ${layout.cor_primaria}; }
    .title-box p { font-size: 8pt; font-style: italic; margin: 2px 0 0 0; color: ${layout.cor_secundaria}; }
    .content { flex: 1; text-align: justify; font-size: ${layout.font_size_body}; line-height: ${layout.line_height}; outline: none; }
    .content p { margin: 0 0 ${layout.paragraph_spacing} 0; }
    .content p:last-child { margin-bottom: 0; }
    .signature { text-align: right; margin-top: 4px; padding-right: 15px; }
    .signature p { margin: 1px 0; font-size: 9.5pt; }
    .footer { font-size: 7.2pt; font-style: italic; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 3px; margin-top: 4px; }
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

  const caminhoLogoEfetivo = (usuario.logoUrl && fs.existsSync(usuario.logoUrl))
    ? usuario.logoUrl
    : null;
  const templateVisual = perfilLaudo?.templateVisual || layout?.visual_config_json || {};

  await gerarDocxLaudo(dadosPaciente, laudoArray, caminhoDocx, caminhoLogoEfetivo, imagensPaths, layout, {
    usuario,
    nomeMedico,
    crmvMedico,
    clinicaNome,
    perfilLaudo,
    templateVisual,
    assinaturaPath: layout?.assinatura_extraida_url || usuario.assinaturaUrl || null
  });

  return { caminhoPdf, caminhoDocx };
}

module.exports = {
  gerarDocumentosExame,
  gerarHtmlTemplateClonado,
  sanitizarParagrafoOrgao,
  formatarNomeOrgaoCase
};
