/**
 * Extrator 100% Agnóstico de Padrão Visual, Geometria e Estilo de Escrita de Laudos (1 a 10 PDFs)
 * - Não possui nenhum perfil de clínica ou veterinário hardcoded.
 * - Analisa qualquer PDF enviado usando `pdftotext -bbox-layout`, `pdfimages`, análise de pixels
 *   em 300 DPI e Gemini Multimodal para copiar automaticamente:
 *   1. Margens exatas (esquerda, direita, topo Pág. 1, topo Pág. 2, rodapé)
 *   2. Estrutura de identificação do paciente (tabela com bordas/traços entre células vs. colunas limpas)
 *   3. Rótulos exatos, larguras percentuais de cada célula e capitalização (CAIXA ALTA vs. Title Case)
 *   4. Presença ou ausência de título de texto abaixo da tabela
 *   5. Ordem, capitalização, sub-itens com traços (`- `) e frases padrão de todos os órgãos do médico
 *   6. Posição da assinatura (centralizada vs. direita, imagem acima vs. abaixo do nome/CRMV)
 *   7. Grid de fotos de ultrassom (6 fotos 2x3 com espaçamento vs. 8 fotos 2x4 coladas, com ou sem papel timbrado)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  rasterizarPdfEmPngs,
  detectarBordasTabelaPaciente,
  extrairAtivosVisuaisDasPaginas
} = require('./extrator_ativos_pdf');

/**
 * Mapeia o nome de qualquer rótulo de campo do paciente no PDF para a chave semântica interna.
 */
function mapearChaveCampoPaciente(labelRaw) {
  const norm = String(labelRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('requisitante') || norm.includes('veterinari') || norm.includes('solicitante') || norm.includes('clinica')) {
    return 'requisitante';
  }
  if (norm.includes('paciente') || norm.includes('animal') || norm.includes('nome')) return 'nome';
  if (norm.includes('tutor') || norm.includes('proprietari') || norm.includes('responsavel')) return 'tutor';
  if (norm.includes('especie')) return 'especie';
  if (norm.includes('raca')) return 'raca';
  if (norm.includes('sexo') || norm.includes('genero')) return 'sexo';
  if (norm.includes('idade') || norm.includes('nascimento')) return 'idade';
  if (norm.includes('data')) return 'data';
  return 'extra';
}

/**
 * Faz o parse completo do XML gerado por `pdftotext -bbox-layout` extraindo páginas, linhas e palavras com coordenadas em pontos (pt).
 */
function extrairGeometriaBboxPdf(caminhoPdf) {
  let xml = '';
  try {
    xml = execFileSync('pdftotext', ['-bbox-layout', caminhoPdf, '-'], {
      encoding: 'utf8',
      timeout: 15000
    });
  } catch (_) {
    return [];
  }

  const pages = [];
  const pageRegex = /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pm;
  while ((pm = pageRegex.exec(xml)) !== null) {
    const width = parseFloat(pm[1]);
    const height = parseFloat(pm[2]);
    const content = pm[3];
    const lines = [];
    const lineRegex = /<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/line>/g;
    let lm;
    while ((lm = lineRegex.exec(content)) !== null) {
      const words = [];
      const wordRegex = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
      let wm;
      while ((wm = wordRegex.exec(lm[5])) !== null) {
        words.push({
          xMin: parseFloat(wm[1]),
          yMin: parseFloat(wm[2]),
          xMax: parseFloat(wm[3]),
          yMax: parseFloat(wm[4]),
          text: wm[5]
        });
      }
      const text = words.map(w => w.text).join(' ').trim();
      if (text) {
        lines.push({
          xMin: parseFloat(lm[1]),
          yMin: parseFloat(lm[2]),
          xMax: parseFloat(lm[3]),
          yMax: parseFloat(lm[4]),
          text,
          words
        });
      }
    }
    pages.push({ width, height, lines });
  }
  return pages;
}

/**
 * Analisa geometricamente as páginas e linhas do PDF de referência para extrair
 * margens, tabela de cabeçalho do paciente, título, órgãos, assinatura e rodapé de forma 100% agnóstica.
 */
function analisarEstruturaGeometricaPdf(pagesBbox, pag1Renderizada = null) {
  const p1 = pagesBbox[0] || { width: 595.32, height: 841.92, lines: [] };
  const pageWidth = p1.width || 595.32;
  const pageHeight = p1.height || 841.92;

  // 1. Localiza a primeira linha de órgão na Página 1
  const regexInicioOrgao = /^(BEXIGA|RINS|RIM\s+ESQUERDO|RIM\s+DIREITO|F[IÍ]GADO|BA[CÇ]O|EST[OÔ]MAGO|VES[IÍ]CULA|ADRENAIS|ADRENAL)\s*:/i;
  let firstOrganIdx = p1.lines.findIndex(l => regexInicioOrgao.test(l.text));
  if (firstOrganIdx === -1) firstOrganIdx = Math.min(8, p1.lines.length);

  const headerLinesRaw = p1.lines.slice(0, firstOrganIdx);
  const bodyLinesP1 = p1.lines.slice(firstOrganIdx).filter(l => l.yMax < pageHeight * 0.88);

  // 2. Calcula Margens Laterais Exatas em mm a partir do corpo do texto
  const xMinBody = bodyLinesP1.length > 0 ? Math.min(...bodyLinesP1.map(l => l.xMin)) : 56.6;
  const xMaxBody = bodyLinesP1.length > 0 ? Math.max(...bodyLinesP1.map(l => l.xMax)) : (pageWidth - 56.6);

  const leftMarginMm = Math.max(5, Math.min(35, Math.round((xMinBody / pageWidth) * 210)));
  const rightMarginMm = Math.max(5, Math.min(35, Math.round(((pageWidth - xMaxBody) / pageWidth) * 210)));

  // 3. Separa eventual Título de Texto (ex: "LAUDO ULTRASSONOGRÁFICO") das linhas de campos do paciente
  let titleConfig = {
    showTextTitle: false,
    text: '',
    subtitle: null,
    fontFamily: 'Calibri, Arial, sans-serif',
    fontSize: '11pt',
    color: '#000000',
    bold: true,
    underline: false,
    alignment: 'center',
    marginTopMm: '6mm',
    marginBottomMm: '8mm'
  };

  const patientCandidateLines = [];
  for (const l of headerLinesRaw) {
    const ehTituloCentral = !l.text.includes(':') && /(LAUDO|RELAT[OÓ]RIO|ULTRASSON)/i.test(l.text);
    if (ehTituloCentral) {
      titleConfig = {
        ...titleConfig,
        showTextTitle: true,
        text: l.text.trim(),
        underline: true
      };
    } else {
      patientCandidateLines.push(l);
    }
  }

  // Une linhas de continuação sem ':' ao campo anterior da mesma coluna (ex: "Requisitante: Dr (a)" + "DIANE")
  const patientLinesMerged = [];
  for (const l of patientCandidateLines) {
    if (!l.text.includes(':') && patientLinesMerged.length > 0) {
      const prev = patientLinesMerged[patientLinesMerged.length - 1];
      prev.text = `${prev.text} ${l.text}`.trim();
      prev.yMax = Math.max(prev.yMax, l.yMax);
      prev.xMax = Math.max(prev.xMax, l.xMax);
    } else if (l.text.includes(':')) {
      patientLinesMerged.push({ ...l });
    }
  }

  // 4. Detecta se os campos do paciente formam uma Tabela com Bordas ("boxed_table") ou Duas Colunas Limpas ("two_columns")
  const firstPatientYMin = patientLinesMerged.length > 0
    ? Math.min(...patientLinesMerged.map(l => l.yMin))
    : 144;
  const lastPatientYMax = patientLinesMerged.length > 0
    ? Math.max(...patientLinesMerged.map(l => l.yMax))
    : 205;

  // Agrupa por faixa horizontal (yMin dentro de ±5.5pt)
  const sortedByY = [...patientLinesMerged].sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin);
  const horizontalRows = [];
  for (const item of sortedByY) {
    const existingRow = horizontalRows.find(r => Math.abs(r.yAvg - item.yMin) <= 5.5);
    if (existingRow) {
      existingRow.items.push(item);
      existingRow.yAvg = existingRow.items.reduce((acc, it) => acc + it.yMin, 0) / existingRow.items.length;
    } else {
      horizontalRows.push({ yAvg: item.yMin, items: [item] });
    }
  }
  horizontalRows.forEach(r => r.items.sort((a, b) => a.xMin - b.xMin));

  const maxCellsInRow = horizontalRows.reduce((m, r) => Math.max(m, r.items.length), 0);
  let temBordasTabela = maxCellsInRow >= 3;

  if (!temBordasTabela && pag1Renderizada && pag1Renderizada.decoded) {
    temBordasTabela = detectarBordasTabelaPaciente(
      pag1Renderizada.decoded,
      firstPatientYMin,
      lastPatientYMax,
      xMinBody,
      xMaxBody,
      pageWidth,
      pageHeight
    );
  }

  // Detecta capitalização dos valores do paciente (UPPERCASE vs TITLE_CASE) e formato de sexo ('M'/'F' vs 'Macho'/'Fêmea')
  let totalValores = 0;
  let valoresUpper = 0;
  let sexoAbreviado = false;

  const parseCellItem = (item) => {
    const idxColon = item.text.indexOf(':');
    const label = idxColon !== -1 ? item.text.slice(0, idxColon + 1).trim() : item.text.trim();
    const valSample = idxColon !== -1 ? item.text.slice(idxColon + 1).trim() : '';
    const key = mapearChaveCampoPaciente(label);

    if (valSample && /[A-Za-zÀ-ÿ]{2,}/.test(valSample) && key !== 'requisitante') {
      totalValores++;
      if (valSample === valSample.toUpperCase()) valoresUpper++;
    }
    if (key === 'sexo' && /^(M|F)$/i.test(valSample)) {
      sexoAbreviado = true;
    }
    return { key, label, xMin: item.xMin, xMax: item.xMax };
  };

  const tableWidthPt = Math.max(200, xMaxBody - xMinBody);
  const rowsEstruturadas = horizontalRows.map((r) => {
    const cells = r.items.map(parseCellItem);
    if (cells.length === 1) {
      return [{ key: cells[0].key, label: cells[0].label, widthPct: 100 }];
    }
    let prevEdge = xMinBody;
    const widths = cells.map((c, idx) => {
      if (idx === cells.length - 1) return 0;
      const nextBorder = Math.max(prevEdge + 30, cells[idx + 1].xMin - 6);
      const pct = Math.max(12, Math.min(85, Math.round(((nextBorder - prevEdge) / tableWidthPt) * 100)));
      prevEdge = nextBorder;
      return pct;
    });
    const somaParcial = widths.slice(0, -1).reduce((a, b) => a + b, 0);
    widths[widths.length - 1] = Math.max(12, 100 - somaParcial);

    return cells.map((c, idx) => ({
      key: c.key,
      label: c.label,
      widthPct: widths[idx]
    }));
  });

  const valueCase = (totalValores > 0 && (valoresUpper / totalValores) >= 0.65) ? 'UPPERCASE' : 'TITLE_CASE';

  // Se for layout de 2 colunas independentes (sem bordas de tabela), organiza também as 2 colunas verticais
  const midPageX = pageWidth * 0.48;
  const colEsquerda = patientLinesMerged.filter(l => l.xMin < midPageX).map(parseCellItem);
  const colDireita = patientLinesMerged.filter(l => l.xMin >= midPageX).map(parseCellItem);

  // 5. Extrai todos os órgãos do corpo do laudo (Páginas 1 e 2), preservando sub-itens com `- ` e `Obs.:`
  const paginasTextoBbox = pagesBbox.filter(p => p.lines.length > 3);
  const todasLinhasTexto = [];
  paginasTextoBbox.forEach((p, idx) => {
    p.lines.forEach(l => todasLinhasTexto.push({ ...l, page: idx + 1, pageWidth: p.width, pageHeight: p.height }));
  });

  const crmvIdx = todasLinhasTexto.findIndex(l => /CRMV/i.test(l.text) && l.yMin < l.pageHeight * 0.88);
  const crmvLine = crmvIdx !== -1 ? todasLinhasTexto[crmvIdx] : null;
  const nomeMedLine = (crmvIdx > 0 && Math.abs(todasLinhasTexto[crmvIdx].yMin - todasLinhasTexto[crmvIdx - 1].yMin) < 32)
    ? todasLinhasTexto[crmvIdx - 1]
    : null;

  const prevBodyLineIdx = crmvIdx !== -1 ? (nomeMedLine ? crmvIdx - 2 : crmvIdx - 1) : -1;
  const prevBodyLine = (prevBodyLineIdx >= 0 && todasLinhasTexto[prevBodyLineIdx]?.page === crmvLine?.page)
    ? todasLinhasTexto[prevBodyLineIdx]
    : null;

  const crmvBlock = crmvLine ? {
    page: crmvLine.page,
    xMin: Math.min(crmvLine.xMin, nomeMedLine ? nomeMedLine.xMin : crmvLine.xMin),
    xMax: Math.max(crmvLine.xMax, nomeMedLine ? nomeMedLine.xMax : crmvLine.xMax),
    yMin: nomeMedLine ? nomeMedLine.yMin : crmvLine.yMin,
    yMax: crmvLine.yMax,
    minYAbovePt: prevBodyLine ? (prevBodyLine.yMax + 4) : 0
  } : null;

  const xCenterSigRatio = crmvBlock ? (((crmvBlock.xMin + crmvBlock.xMax) / 2) / pageWidth) : 0.72;
  const sigAlignment = (xCenterSigRatio >= 0.38 && xCenterSigRatio <= 0.62) ? 'center' : 'right';

  const startBodyGlobalIdx = todasLinhasTexto.findIndex(l => regexInicioOrgao.test(l.text));
  const endBodyGlobalIdx = crmvIdx !== -1
    ? (nomeMedLine ? crmvIdx - 1 : crmvIdx)
    : todasLinhasTexto.length;

  const organRegex = /^([A-ZÀ-ÚÇ][A-ZÀ-Úa-zà-úçõãâêíóú\s\/]{2,35}):\s*(.*)$/;
  const orgaosExtraidos = [];
  let atualOrgao = null;

  for (let i = Math.max(0, startBodyGlobalIdx); i < endBodyGlobalIdx; i++) {
    const l = todasLinhasTexto[i];
    if (l.yMin > l.pageHeight * 0.88) continue;

    const m = l.text.match(organRegex);
    const ehCabecalhoRepetido = /^(Paciente|Data|Esp[eé]cie|Ra[cç]a|Sexo|Idade|Tutor|Propriet[aá]rio|Requisitante|M[eé]dico|E-mail|Obs\.?|Nota)\b/i.test(m ? m[1] : '');

    if (m && !ehCabecalhoRepetido) {
      if (atualOrgao) orgaosExtraidos.push(atualOrgao);
      atualOrgao = {
        orgao: m[1].trim(),
        page: l.page,
        linhas: [m[2].trim()]
      };
    } else if (atualOrgao) {
      if (/^(-\s+|Obs\.?:)/i.test(l.text)) {
        atualOrgao.linhas.push('\n' + l.text);
      } else if (
        atualOrgao.linhas.length > 1 &&
        atualOrgao.linhas[atualOrgao.linhas.length - 1].trim().startsWith('-') &&
        atualOrgao.linhas[atualOrgao.linhas.length - 1].trim().endsWith('.') &&
        /^[A-ZÀ-Ú]/.test(l.text)
      ) {
        // Parágrafo de fechamento após lista de traços (ex: "Junção ileocólica preservada...")
        atualOrgao.linhas.push('\n' + l.text);
      } else {
        atualOrgao.linhas.push(l.text);
      }
    }
  }
  if (atualOrgao) orgaosExtraidos.push(atualOrgao);

  const orgaosUpperCount = orgaosExtraidos.filter(o => o.orgao === o.orgao.toUpperCase()).length;
  const organLabelCase = (orgaosExtraidos.length > 0 && (orgaosUpperCount / orgaosExtraidos.length) >= 0.6)
    ? 'UPPERCASE'
    : 'SENTENCE_CASE';

  // Mede lineHeight e paragraphSpacing reais a partir das coordenadas yMin das linhas do corpo na Página 1
  const linhasTextoPag1Medicao = todasLinhasTexto.slice(Math.max(0, startBodyGlobalIdx), endBodyGlobalIdx).filter(l => l.page === 1 && l.yMin < l.pageHeight * 0.86);
  const intraParaDeltas = [];
  const interParaGaps = [];
  for (let i = 1; i < linhasTextoPag1Medicao.length; i++) {
    const dy = linhasTextoPag1Medicao[i].yMin - linhasTextoPag1Medicao[i - 1].yMin;
    if (dy <= 4 || dy > 45) continue;
    const isNewOrgan = organRegex.test(linhasTextoPag1Medicao[i].text) && !/^(Obs\.?|Nota):/i.test(linhasTextoPag1Medicao[i].text);
    const isSubItem = /^(-\s+|Obs\.?)/i.test(linhasTextoPag1Medicao[i].text);
    if (!isNewOrgan && !isSubItem && dy <= 22) {
      intraParaDeltas.push(dy);
    } else if (isNewOrgan) {
      interParaGaps.push(dy);
    }
  }
  intraParaDeltas.sort((a, b) => a - b);
  interParaGaps.sort((a, b) => a - b);
  const medianIntraDy = intraParaDeltas.length > 0 ? intraParaDeltas[Math.floor(intraParaDeltas.length / 2)] : 13.5;
  const medianInterDy = interParaGaps.length > 0 ? interParaGaps[Math.floor(interParaGaps.length / 2)] : (medianIntraDy + 6);
  const measuredLineHeight = Math.max(1.15, Math.min(1.68, Number((medianIntraDy / 11).toFixed(2))));
  const measuredParaSpacingPt = Math.max(4, Math.min(12, Math.round(Math.max(4.5, medianInterDy - medianIntraDy))));

  const topFirstPageMm = Math.max(12, Math.min(75, Math.round((firstPatientYMin / pageHeight) * 297)));
  const p2Lines = pagesBbox[1]?.lines || [];
  const topContinuationPagesMm = p2Lines.length > 0
    ? Math.max(15, Math.min(75, Math.round((p2Lines[0].yMin / pageHeight) * 297)))
    : topFirstPageMm;

  // Linhas de rodapé (yMin >= pageHeight * 0.88) na página de assinatura
  const sigPageNum = crmvLine ? crmvLine.page : (paginasTextoBbox.length || 1);
  const footerLinesP2 = todasLinhasTexto.filter(l => l.page === sigPageNum && l.yMin >= l.pageHeight * 0.88);
  const contactLines = footerLinesP2.filter(l => /CRMV|@|outlook|gmail|tel|\(\d{2}\)/i.test(l.text));
  const disclaimerLines = footerLinesP2.filter(l => !contactLines.includes(l) && l.text.trim().length > 10);

  return {
    margins: {
      topFirstPage: `${topFirstPageMm}mm`,
      topContinuationPages: `${topContinuationPagesMm}mm`,
      bottom: '26mm',
      left: `${leftMarginMm}mm`,
      right: `${rightMarginMm}mm`
    },
    patientHeader: {
      layoutType: temBordasTabela ? 'boxed_table' : 'two_columns',
      valueCase,
      sexoAbreviado,
      bottomDivider: !temBordasTabela,
      rows: rowsEstruturadas,
      columns: [colEsquerda, colDireita]
    },
    titleConfig,
    organLabelCase,
    orgaosExtraidos: orgaosExtraidos.map(o => ({
      orgao: o.orgao,
      page: o.page,
      obrigatorio: true,
      textoPadraoNormal: o.linhas.join(' ').replace(/ +\n/g, '\n').replace(/\n +/g, '\n').trim()
    })),
    firstPageOrganCount: orgaosExtraidos.filter(o => o.page === 1).length || 7,
    measuredLineHeight: String(measuredLineHeight),
    measuredParaSpacingPt: `${measuredParaSpacingPt}pt`,
    crmvBlock,
    signatureInfo: {
      alignment: sigAlignment,
      nomeMedico: nomeMedLine ? nomeMedLine.text.trim() : '',
      crmv: crmvLine ? crmvLine.text.trim() : '',
      textLines: [
        ...(nomeMedLine ? [{ text: nomeMedLine.text.trim(), bold: !/^M\.\s*V\./i.test(nomeMedLine.text), italic: /^M\.\s*V\./i.test(nomeMedLine.text), fontSize: '11pt' }] : []),
        ...(crmvLine ? [{ text: crmvLine.text.trim(), bold: !/^M\.\s*V\./i.test(nomeMedLine?.text || ''), italic: false, fontSize: '11pt' }] : [])
      ]
    },
    footerInfo: {
      disclaimerText: disclaimerLines.map(l => l.text).join(' ').trim() || null,
      contactLines: contactLines.map(l => l.text.trim())
    },
    firstTextYMinPt: firstPatientYMin,
    pageWidthPt: pageWidth,
    pageHeightPt: pageHeight
  };
}

/**
 * Extrai de 1 a 10 PDFs todo o padrão visual (papel timbrado A4 completo ou recortes 300 DPI + geometria exata)
 * e estilo de escrita de forma 100% agnóstica.
 */
async function extrairPadraoCompletoDePdfs(caminhosPdfs, apiKey, usuario = {}, pastaDestinoBase = null) {
  if (!Array.isArray(caminhosPdfs) || caminhosPdfs.length === 0) {
    throw new Error('Envie pelo menos 1 arquivo PDF de laudo para extrair o padrão.');
  }

  const pdfsLimitados = caminhosPdfs.slice(0, 10);
  const pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'vetaro_pdf_extract_'));
  const userIdSafe = String(usuario?.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  const pastaAtivosUsuario = pastaDestinoBase || path.join(__dirname, 'uploads', 'templates', userIdSafe);

  try {
    // 1. Rasteriza o primeiro PDF em 300 DPI e extrai a geometria exata via `pdftotext -bbox-layout`
    const paginasPrimeiroPdf = rasterizarPdfEmPngs(pdfsLimitados[0], pastaTemp, 7);
    const pagesBbox = extrairGeometriaBboxPdf(pdfsLimitados[0]);
    const pag1Render = paginasPrimeiroPdf[0] || null;

    const geo = analisarEstruturaGeometricaPdf(pagesBbox, pag1Render);

    // 2. Extrai os ativos visuais reais (Papel timbrado A4 completo ou Banner + Assinatura transparente + Rodapé)
    const ativos = extrairAtivosVisuaisDasPaginas(paginasPrimeiroPdf, pastaAtivosUsuario, {
      caminhoPdf: pdfsLimitados[0],
      pastaTemp,
      firstTextYMinPt: geo.firstTextYMinPt,
      pageWidthPt: geo.pageWidthPt,
      pageHeightPt: geo.pageHeightPt,
      crmvBlock: geo.crmvBlock
    });

    // 3. Se houver múltiplos PDFs, consolida também órgãos adicionais vistos nos demais PDFs
    const mapaOrgaos = new Map();
    for (const org of geo.orgaosExtraidos) {
      mapaOrgaos.set(org.orgao.toUpperCase(), org);
    }
    for (let idx = 1; idx < pdfsLimitados.length; idx++) {
      const bboxExtra = extrairGeometriaBboxPdf(pdfsLimitados[idx]);
      const geoExtra = analisarEstruturaGeometricaPdf(bboxExtra, null);
      for (const org of geoExtra.orgaosExtraidos) {
        if (!mapaOrgaos.has(org.orgao.toUpperCase())) {
          mapaOrgaos.set(org.orgao.toUpperCase(), org);
        }
      }
    }
    const sequenciaOrgaosConsolidada = Array.from(mapaOrgaos.values());

    // 4. Configura o Grid de Imagens de Ultrassom de acordo com a contagem real de fotos por página (ex: 6 fotos 2x3 vs 8 fotos 2x4)
    const fotosPorPag = ativos.fotosPorPaginaDetectadas || 8;
    const rowsPerPage = fotosPorPag <= 6 ? 3 : 4;
    const ehStationeryFullPage = ativos.stationeryMode === 'full_page_background';

    const imageGridConfig = {
      columns: 2,
      rowsPerPage,
      colGapMm: ehStationeryFullPage ? '12.5mm' : '0.5mm',
      rowGapMm: ehStationeryFullPage ? '0mm' : '0.5mm',
      cardHeightMm: rowsPerPage === 3 ? '56.5mm' : '65mm',
      border: 'none',
      pagePaddingTopMm: ehStationeryFullPage ? geo.margins.topFirstPage : '18mm',
      pagePaddingSidesMm: geo.margins.left
    };

    const textoCompletoOrgaos = sequenciaOrgaosConsolidada.map(o => o.textoPadraoNormal).join('\n');
    const usaTracosSubitens = /\n-\s+/.test(textoCompletoOrgaos);
    const usaObsItalico = /\bObs\.?:/i.test(textoCompletoOrgaos);
    const temRinsResumo = sequenciaOrgaosConsolidada.some(o => /^RINS$/i.test(o.orgao)) &&
                          sequenciaOrgaosConsolidada.some(o => /^RIM\s+ESQUERDO$/i.test(o.orgao));
    const separaAdrenais = sequenciaOrgaosConsolidada.some(o => /^ADRENAL\s+ESQUERDA$/i.test(o.orgao));

    return {
      identidadeProfissional: {
        nomeMedico: geo.signatureInfo.nomeMedico || usuario?.nome || 'Médico(a) Veterinário(a)',
        crmv: geo.signatureInfo.crmv || usuario?.crmv || '',
        nomeClinica: usuario?.nomeClinica || 'Vetaro',
        emailContato: null,
        telefoneContato: null
      },
      ativosVisuais: {
        stationeryMode: ativos.stationeryMode,
        pageBackgroundUrl: ativos.pageBackgroundPath,
        headerBannerUrl: ativos.headerBannerPath,
        assinaturaUrl: ativos.signaturePath,
        footerLogoUrl: ativos.footerLogoPath
      },
      layoutVisual: {
        stationeryMode: ativos.stationeryMode,
        headerMode: ehStationeryFullPage
          ? 'full_page_stationery'
          : (ativos.headerEhFullBleed ? 'full_bleed_banner' : 'centered_logo'),
        repeatHeaderOnTextPage2: ehStationeryFullPage || parseInt(geo.margins.topContinuationPages, 10) >= 40,
        repeatHeaderOnImagePages: ehStationeryFullPage,
        margins: geo.margins,
        patientHeader: geo.patientHeader,
        titleConfig: geo.titleConfig,
        bodyTypography: {
          fontFamily: 'Calibri, Carlito, Arial, sans-serif',
          fontSize: '11pt',
          lineHeight: geo.measuredLineHeight || (ehStationeryFullPage ? '1.22' : '1.58'),
          paragraphSpacing: geo.measuredParaSpacingPt || (ehStationeryFullPage ? '5.5pt' : '9pt'),
          textAlign: ehStationeryFullPage ? 'justify' : 'left',
          organLabelCase: geo.organLabelCase,
          organLabelBold: true,
          paginationMode: 'two_page_flow',
          firstPageOrganCount: geo.firstPageOrganCount
        },
        signatureConfig: {
          alignment: geo.signatureInfo.alignment,
          paddingRightMm: geo.signatureInfo.alignment === 'right' ? '22mm' : '0mm',
          marginTopMm: '14mm',
          order: ativos.signaturePositionOrder,
          textLines: geo.signatureInfo.textLines,
          signatureImageHeightMm: ativos.signaturePositionOrder === 'image_above_text' ? '12mm' : '18mm'
        },
        footerConfig: {
          showOnTextPages: ehStationeryFullPage ? 'baked_in_stationery' : 'last_text_page_disclaimer_all_text_pages_logo',
          showOnImagePages: ehStationeryFullPage,
          disclaimerText: geo.footerInfo.disclaimerText,
          disclaimerFontFamily: ehStationeryFullPage ? 'Calibri, sans-serif' : "'Courier New', Courier, monospace",
          disclaimerFontSize: '8.5pt',
          dividerStyle: 'dashed',
          contactLines: geo.footerInfo.contactLines,
          contactFontFamily: ehStationeryFullPage ? 'Calibri, sans-serif' : "'Courier New', Courier, monospace",
          contactFontSize: '8.5pt',
          showFooterLogo: Boolean(ativos.footerLogoPath)
        },
        imageGridConfig
      },
      estiloEscritaClinica: {
        usarDiagDifSeparado: false,
        usarTopicoConsideracoesSeparado: false,
        usarSubitensComTraco: usaTracosSubitens,
        usarObsItalico: usaObsItalico,
        formatoConclusao: 'INLINE_NO_ORGAO',
        omitirOrgaosSexoOposto: true,
        incluirLinhaResumoRins: temRinsResumo,
        separarAdrenaisEmDoisTopicos: separaAdrenais,
        sequenciaOrgaos: sequenciaOrgaosConsolidada
      },
      pdfsAnalisados: pdfsLimitados.length
    };
  } finally {
    try {
      fs.rmSync(pastaTemp, { recursive: true, force: true });
    } catch (_) {}
  }
}

module.exports = {
  mapearChaveCampoPaciente,
  extrairGeometriaBboxPdf,
  analisarEstruturaGeometricaPdf,
  extrairPadraoCompletoDePdfs
};
