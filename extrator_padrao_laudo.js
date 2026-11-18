/**
 * Extrator 100% Agnóstico de Padrão Visual, Geometria e Estilo de Escrita de Laudos (1 a 10 PDFs)
 * - Não possui nenhum perfil de clínica ou veterinário hardcoded.
 * - Analisa qualquer PDF enviado usando `pdftotext -bbox-layout`, `pdffonts`, `pdfimages` e análise de pixels
 *   em 300 DPI para copiar automaticamente:
 *   1. Margens exatas (esquerda, direita, topo Pág. 1, topo Pág. 2+, rodapé)
 *   2. Composição do cabeçalho (papel timbrado A4, logo lado a lado com dados do paciente à esquerda/direita,
 *      banner/logo superior acima dos dados, ou tipográfico) e sua repetição em páginas de texto e de imagens
 *   3. Estrutura de identificação do paciente (tabela com bordas vs. colunas limpas, posições X/Y reais,
 *      presença real de linha divisória inferior, rótulos exatos e capitalização)
 *   4. Título do documento, subtítulo descritivo, sublinhado real e espaçamentos
 *   5. Tipografia real (família de fonte, tamanho do corpo/título/cabeçalho/rodapé, entrelinha e espaçamento entre parágrafos)
 *   6. Ordem, capitalização, sub-itens com traços (`- `), `Obs.:`, `DIAG DIF.` e `CONSIDERAÇÕES`
 *   7. Posição, ordem (imagem acima/abaixo do texto), linha horizontal e tamanho real da assinatura
 *   8. Rodapé (texto, fonte, itálico, presença real de borda superior e repetição em páginas de texto/imagens)
 *   9. Grid de fotos de ultrassom (colunas, linhas, dimensões reais dos cards, espaçamentos e centralização da última foto)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  rasterizarPdfEmPngs,
  detectarBordasTabelaPaciente,
  detectarLinhaHorizontal,
  extrairAtivosVisuaisDasPaginas
} = require('./extrator_ativos_pdf');

/**
 * Mapeia o nome de qualquer rótulo de campo do paciente no PDF para a chave semântica interna.
 */
/**
 * Regra universal (norma veterinária): substitui qualquer rótulo "Tutor" / "Tutor(a)" por "Responsável".
 * Mantém CAIXA ALTA se o rótulo original estiver todo em maiúsculas e preserva ":" quando presente.
 */
function normalizarRotuloResponsavel(labelRaw) {
  const s = String(labelRaw || "").trim();
  if (!s) return s;
  if (/\btutor(?:\s*\(?a\)?)?\b/i.test(s)) {
    const temDoisPontos = s.endsWith(":");
    const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
    const ehUpper = letras.length > 0 && letras === letras.toUpperCase();
    const base = ehUpper ? "RESPONSÁVEL" : "Responsável";
    return temDoisPontos ? `${base}:` : base;
  }
  return s;
}

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
 * Detecta as famílias de fonte realmente embutidas no PDF via `pdffonts`.
 */
function extrairFontesPdf(caminhoPdf) {
  if (!caminhoPdf || !fs.existsSync(caminhoPdf)) {
    return { bodyFontFamily: 'Calibri, Carlito, Arial, sans-serif', headerFontFamily: 'Arial, Calibri, sans-serif', footerItalic: true, rawFonts: [] };
  }
  try {
    const out = execFileSync('pdffonts', [caminhoPdf], { encoding: 'utf8', timeout: 10000 });
    const lines = out.split(/\r?\n/).slice(2).map(l => l.trim()).filter(Boolean);
    const rawFonts = lines.map(l => l.split(/\s+/)[0]).filter(Boolean);
    const joined = rawFonts.join(' ').toLowerCase();

    let bodyFontFamily = 'Calibri, Carlito, Arial, sans-serif';
    if (joined.includes('calibri') || joined.includes('carlito')) {
      bodyFontFamily = 'Calibri, Carlito, Arial, sans-serif';
    } else if (joined.includes('microsoftnewtailue') || joined.includes('tailue')) {
      bodyFontFamily = "'Microsoft New Tai Lue', Calibri, Carlito, Arial, sans-serif";
    } else if (joined.includes('arial') || joined.includes('liberation')) {
      bodyFontFamily = 'Arial, Helvetica, sans-serif';
    } else if (joined.includes('roboto')) {
      bodyFontFamily = 'Roboto, Arial, sans-serif';
    } else if (joined.includes('helvetica')) {
      bodyFontFamily = 'Helvetica, Arial, sans-serif';
    } else if (joined.includes('times')) {
      bodyFontFamily = "'Times New Roman', Times, serif";
    } else if (joined.includes('georgia')) {
      bodyFontFamily = 'Georgia, serif';
    }

    let headerFontFamily = bodyFontFamily;
    if (joined.includes('arial')) {
      headerFontFamily = 'Arial, Helvetica, sans-serif';
    }

    const footerItalic = joined.includes('italic') || joined.includes('oblique');
    const hasCourier = joined.includes('courier');

    return { bodyFontFamily, headerFontFamily, footerItalic, hasCourier, rawFonts };
  } catch (_) {
    return { bodyFontFamily: 'Calibri, Carlito, Arial, sans-serif', headerFontFamily: 'Arial, Calibri, sans-serif', footerItalic: true, hasCourier: false, rawFonts: [] };
  }
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
      const text = words.map(w => w.text).join(' ')
        .replace(/\ufb01/g, 'fi')
        .replace(/\ufb02/g, 'fl')
        .replace(/([a-záéíóúâêôãõç])\s+co\b/gi, '$1fico')
        .replace(/\bu\s+lizando\b/gi, 'utilizando')
        .replace(/\bsuper\s+cie\b/gi, 'superfície')
        .replace(/\bcor\s+cal\b/gi, 'cortical')
        .trim();
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

function mediana(nums, fallback) {
  if (!Array.isArray(nums) || nums.length === 0) return fallback;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Normaliza rótulo de campo do paciente para comparação de cabeçalho repetido entre páginas.
 */
function extrairAssinaturaLinhasCabecalho(lines, yMaxLimite) {
  return lines
    .filter(l => l.yMax <= yMaxLimite && l.text.includes(':'))
    .map(l => l.text.split(':')[0].trim().toLowerCase())
    .sort()
    .join('|');
}

/**
 * Analisa geometricamente as páginas e linhas do PDF de referência para extrair
 * margens, tabela/colunas de cabeçalho do paciente, repetição entre páginas, título/subtítulo,
 * órgãos, assinatura e rodapé de forma 100% agnóstica.
 */
function analisarEstruturaGeometricaPdf(pagesBbox, pag1Renderizada = null, opcoes = {}) {
  const p1 = pagesBbox[0] || { width: 595.32, height: 841.92, lines: [] };
  const pageWidth = p1.width || 595.32;
  const pageHeight = p1.height || 841.92;
  const ptToMmX = 210 / pageWidth;
  const ptToMmY = 297 / pageHeight;
  const fontes = opcoes.fontes || {
    bodyFontFamily: 'Calibri, Carlito, Arial, sans-serif',
    headerFontFamily: 'Arial, Helvetica, sans-serif',
    footerItalic: true,
    hasCourier: false
  };
  const paginasRenderizadas = opcoes.paginasRenderizadas || (pag1Renderizada ? [pag1Renderizada] : []);

  // 1. Localiza a primeira linha de órgão na Página 1
  const regexInicioOrgao = /^(BEXIGA|RINS|RIM\s+ESQUERDO|RIM\s+DIREITO|F[IÍ]GADO|BA[CÇ]O|EST[OÔ]MAGO|VES[IÍ]CULA|ADRENAIS|ADRENAL|GL[AÂ]NDULA\s+ADRENAL|AL[CÇ]AS\s+INTESTINAIS|P[AÂ]NCREAS|PANCREAS|[UÚ]TERO|OV[AÁ]RIOS)\s*:/i;
  let firstOrganIdx = p1.lines.findIndex(l => regexInicioOrgao.test(l.text));
  if (firstOrganIdx === -1) firstOrganIdx = Math.min(8, p1.lines.length);

  const headerLinesRaw = p1.lines.slice(0, firstOrganIdx);
  const bodyLinesP1 = p1.lines.slice(firstOrganIdx).filter(l => l.yMax < pageHeight * 0.88);
  const firstOrganLine = p1.lines[firstOrganIdx] || null;

  // 2. Calcula Margens Laterais Exatas em mm a partir do corpo do texto
  const xMinBody = bodyLinesP1.length > 0 ? Math.min(...bodyLinesP1.map(l => l.xMin)) : 56.7;
  const xMaxBody = bodyLinesP1.length > 0 ? Math.max(...bodyLinesP1.map(l => l.xMax)) : (pageWidth - 56.7);

  const leftMarginMm = Math.max(5, Math.min(35, Math.round(xMinBody * ptToMmX)));
  const rightMarginMm = Math.max(5, Math.min(35, Math.round((pageWidth - xMaxBody) * ptToMmX)));

  // Mede tamanho de fonte real do corpo (pt) pela mediana das alturas das linhas do corpo
  const bodyLineHeightsPt = bodyLinesP1
    .map(l => l.yMax - l.yMin)
    .filter(h => h >= 7 && h <= 16);
  const rawBodyPt = mediana(bodyLineHeightsPt, 10.5);
  // pdftotext -bbox-layout reporta yMax-yMin muito próximo ao fontSize (ex: 10.0pt para Calibri 10pt, 11.0pt para 11pt)
  const measuredBodyFontPt = Math.max(8.5, Math.min(13, Math.round(rawBodyPt * 2) / 2));

  // 3. Separa Título Principal + Subtítulo Descritivo das linhas de campos do paciente
  let titleLine = null;
  const subtitleLines = [];
  const patientCandidateLines = [];

  for (const l of headerLinesRaw) {
    const ehTituloCentral = !l.text.includes(':') && /(LAUDO|RELAT[OÓ]RIO|ULTRASSON|EXAME\s+ULTRASS)/i.test(l.text) && !titleLine;
    if (ehTituloCentral) {
      titleLine = l;
    } else if (titleLine && !l.text.includes(':')) {
      // Linhas descritivas logo abaixo do título principal (ex: "Exame ultrassonográfico realizado em modo B...")
      subtitleLines.push(l);
    } else {
      patientCandidateLines.push(l);
    }
  }

  // Detecta se o título realmente tem sublinhado horizontal abaixo dele
  const titleHasUnderline = Boolean(
    titleLine && pag1Renderizada?.decoded &&
    detectarLinhaHorizontal(
      pag1Renderizada.decoded,
      titleLine.yMax - 1,
      titleLine.yMax + 4,
      titleLine.xMin,
      titleLine.xMax,
      pageWidth,
      pageHeight,
      { minCoverage: 0.75, limiarLum: 210 }
    )
  );

  const titleFontPt = titleLine
    ? Math.max(10, Math.min(18, Math.round((titleLine.yMax - titleLine.yMin) * 2) / 2))
    : 12;
  const subtitleFontPt = subtitleLines.length > 0
    ? Math.max(7, Math.min(11, Math.round(mediana(subtitleLines.map(l => l.yMax - l.yMin), 8) * 2) / 2))
    : 8;

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

  // 4. Geometria do bloco de dados do paciente
  const firstPatientYMin = patientLinesMerged.length > 0
    ? Math.min(...patientLinesMerged.map(l => l.yMin))
    : 144;
  const lastPatientYMax = patientLinesMerged.length > 0
    ? Math.max(...patientLinesMerged.map(l => l.yMax))
    : 205;
  const patientXMin = patientLinesMerged.length > 0
    ? Math.min(...patientLinesMerged.map(l => l.xMin))
    : xMinBody;
  const patientXMax = patientLinesMerged.length > 0
    ? Math.max(...patientLinesMerged.map(l => l.xMax))
    : xMaxBody;

  const patientHeaderBoxPt = patientLinesMerged.length > 0
    ? { xMin: patientXMin, xMax: patientXMax, yMin: firstPatientYMin, yMax: lastPatientYMax }
    : null;

  const titleMarginTopMm = titleLine
    ? Math.max(2, Math.min(20, Math.round((titleLine.yMin - lastPatientYMax) * ptToMmY)))
    : 6;
  const bottomOfTitleOrSub = subtitleLines.length > 0
    ? Math.max(...subtitleLines.map(l => l.yMax))
    : (titleLine ? titleLine.yMax : lastPatientYMax);
  const titleMarginBottomMm = (titleLine && firstOrganLine)
    ? Math.max(3, Math.min(18, Math.round((firstOrganLine.yMin - bottomOfTitleOrSub) * ptToMmY)))
    : 6;

  const titleConfig = {
    showTextTitle: Boolean(titleLine),
    text: titleLine ? titleLine.text.trim() : '',
    subtitle: subtitleLines.length > 0 ? subtitleLines.map(l => l.text.trim()).join(' ') : null,
    fontFamily: fontes.bodyFontFamily,
    fontSize: `${titleFontPt}pt`,
    subtitleFontSize: `${subtitleFontPt}pt`,
    color: '#000000',
    bold: true,
    underline: titleHasUnderline,
    alignment: 'center',
    marginTopMm: `${titleMarginTopMm}mm`,
    marginBottomMm: `${titleMarginBottomMm}mm`
  };

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

  // Detecta geometricamente se existe linha divisória horizontal abaixo do cabeçalho do paciente
  const nextElementYMin = titleLine
    ? titleLine.yMin
    : (firstOrganLine ? firstOrganLine.yMin : lastPatientYMax + 20);
  const temDivisorInferiorReal = Boolean(
    !temBordasTabela &&
    pag1Renderizada?.decoded &&
    detectarLinhaHorizontal(
      pag1Renderizada.decoded,
      lastPatientYMax + 1,
      Math.max(lastPatientYMax + 10, nextElementYMin - 2),
      xMinBody,
      xMaxBody,
      pageWidth,
      pageHeight,
      { minCoverage: 0.72, limiarLum: 225 }
    )
  );

  // Detecta se o bloco de cabeçalho do paciente se repete na Página 2 e nas páginas de imagem!
  const headerYCutoff = lastPatientYMax + 12;
  const sigHeaderP1 = extrairAssinaturaLinhasCabecalho(p1.lines, headerYCutoff);
  let repeatPatientHeaderOnTextPages = false;
  let repeatPatientHeaderOnImagePages = false;

  if (sigHeaderP1 && pagesBbox.length >= 2) {
    const p2 = pagesBbox[1];
    if (p2) {
      const sigP2 = extrairAssinaturaLinhasCabecalho(p2.lines, headerYCutoff);
      if (sigP2 && sigP2 === sigHeaderP1) {
        repeatPatientHeaderOnTextPages = true;
      }
    }
    // Verifica páginas de mosaico (ou últimas páginas)
    const mosaicPagesIndices = paginasRenderizadas
      .filter(p => p.ehMosaico)
      .map(p => p.numeroPagina - 1);
    const checkIdx = mosaicPagesIndices.length > 0 ? mosaicPagesIndices[0] : (pagesBbox.length >= 3 ? 2 : -1);
    if (checkIdx >= 0 && pagesBbox[checkIdx]) {
      const sigImgPag = extrairAssinaturaLinhasCabecalho(pagesBbox[checkIdx].lines, headerYCutoff);
      if (sigImgPag && sigImgPag === sigHeaderP1) {
        repeatPatientHeaderOnImagePages = true;
      }
    }
  }

  // Detecta capitalização dos valores do paciente (UPPERCASE vs TITLE_CASE) e formato de sexo ('M'/'F' vs 'Macho'/'Fêmea')
  let totalValores = 0;
  let valoresUpper = 0;
  let sexoAbreviado = false;

  const parseCellItem = (item) => {
    const idxColon = item.text.indexOf(':');
    const labelBruto = idxColon !== -1 ? item.text.slice(0, idxColon + 1).trim() : item.text.trim();
    const label = normalizarRotuloResponsavel(labelBruto);
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

  // Se for layout de 2 colunas independentes (sem bordas de tabela), divide pelo ponto médio REAL das linhas de paciente
  const midPatientX = patientLinesMerged.length > 0
    ? ((patientXMin + patientXMax) / 2)
    : (pageWidth * 0.48);
  // Tenta agrupar por clusters X reais (evita errar quando o bloco inteiro está deslocado à direita por causa da logo à esquerda!)
  const distinctXStarts = [];
  for (const item of patientLinesMerged) {
    const found = distinctXStarts.find(x => Math.abs(x - item.xMin) <= 18);
    if (!found) distinctXStarts.push(item.xMin);
  }
  distinctXStarts.sort((a, b) => a - b);

  let colEsquerda = [];
  let colDireita = [];
  let colXPositionsMm = [];

  if (distinctXStarts.length >= 2) {
    const splitX = (distinctXStarts[0] + distinctXStarts[1]) / 2;
    colEsquerda = patientLinesMerged.filter(l => l.xMin < splitX).sort((a, b) => a.yMin - b.yMin).map(parseCellItem);
    colDireita = patientLinesMerged.filter(l => l.xMin >= splitX).sort((a, b) => a.yMin - b.yMin).map(parseCellItem);
    colXPositionsMm = [
      Number((distinctXStarts[0] * ptToMmX).toFixed(1)),
      Number((distinctXStarts[1] * ptToMmX).toFixed(1))
    ];
  } else {
    colEsquerda = patientLinesMerged.filter(l => l.xMin < midPatientX).sort((a, b) => a.yMin - b.yMin).map(parseCellItem);
    colDireita = patientLinesMerged.filter(l => l.xMin >= midPatientX).sort((a, b) => a.yMin - b.yMin).map(parseCellItem);
    colXPositionsMm = [Number((patientXMin * ptToMmX).toFixed(1))];
  }

  const patientFontPt = patientLinesMerged.length > 0
    ? Math.max(8.5, Math.min(12, Math.round(mediana(patientLinesMerged.map(l => l.yMax - l.yMin), 10) * 2) / 2))
    : 10;

  // 5. Extrai todos os órgãos do corpo do laudo (Páginas de texto), ignorando cabeçalho repetido nas páginas 2+
  const paginasTextoBbox = pagesBbox.filter((p, idx) => {
    const renderInfo = paginasRenderizadas[idx];
    if (renderInfo) return renderInfo.ehPaginaTexto;
    return p.lines.length > 3;
  });

  const todasLinhasTexto = [];
  paginasTextoBbox.forEach((p, idx) => {
    const pageNum = pagesBbox.indexOf(p) + 1;
    p.lines.forEach(l => {
      // Ignora cabeçalho repetido nas páginas 2+
      if (pageNum > 1 && repeatPatientHeaderOnTextPages && l.yMax <= headerYCutoff) return;
      todasLinhasTexto.push({ ...l, page: pageNum, pageWidth: p.width, pageHeight: p.height });
    });
  });

  const crmvIdx = todasLinhasTexto.findIndex(l => /CRMV/i.test(l.text) && l.yMin < l.pageHeight * 0.88);
  const crmvLine = crmvIdx !== -1 ? todasLinhasTexto[crmvIdx] : null;
  const nomeMedLine = (crmvIdx > 0 &&
    todasLinhasTexto[crmvIdx - 1].page === crmvLine.page &&
    Math.abs(todasLinhasTexto[crmvIdx].yMin - todasLinhasTexto[crmvIdx - 1].yMin) < 32)
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
  const sigAlignment = xCenterSigRatio < 0.35
    ? 'left'
    : ((xCenterSigRatio >= 0.35 && xCenterSigRatio <= 0.62) ? 'center' : 'right');
  const sigRightOffsetMm = crmvBlock && sigAlignment === 'right'
    ? Math.max(0, Math.round((pageWidth - crmvBlock.xMax) * ptToMmX) - rightMarginMm)
    : 0;

  // Detecta se existe linha horizontal acima da assinatura
  const pagSigRender = crmvBlock
    ? paginasRenderizadas.find(p => p.numeroPagina === crmvBlock.page)
    : null;
  const signatureHasTopLine = Boolean(
    crmvBlock && pagSigRender?.decoded &&
    detectarLinhaHorizontal(
      pagSigRender.decoded,
      crmvBlock.yMin - 12,
      crmvBlock.yMin - 1,
      Math.max(0, crmvBlock.xMin - 20),
      Math.min(pageWidth, crmvBlock.xMax + 20),
      pageWidth,
      pageHeight,
      { minCoverage: 0.75, limiarLum: 210 }
    )
  );

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
    const ehCabecalhoRepetido = /^(Nome|Paciente|Data|Esp[eé]cie|Ra[cç]a|Sexo|Idade|Tutor|Respons[aá]vel|Propriet[aá]rio|Requisitante|M[eé]dico|E-mail|Obs\.?|Nota|AE|AD|RE|RD|OE|OD)\b/i.test(m ? m[1] : '');

    if (m && !ehCabecalhoRepetido) {
      if (atualOrgao) orgaosExtraidos.push(atualOrgao);
      atualOrgao = {
        orgao: m[1].trim(),
        page: l.page,
        linhas: [m[2].trim()]
      };
    } else if (atualOrgao) {
      if (/^(-\s+|Obs\.?:|AE:|AD:|OE:|OD:)/i.test(l.text)) {
        atualOrgao.linhas.push('\n' + l.text);
      } else if (
        atualOrgao.linhas.length > 1 &&
        atualOrgao.linhas[atualOrgao.linhas.length - 1].trim().startsWith('-') &&
        atualOrgao.linhas[atualOrgao.linhas.length - 1].trim().endsWith('.') &&
        /^[A-ZÀ-Ú]/.test(l.text)
      ) {
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
  const linhasTextoPag1Medicao = todasLinhasTexto
    .slice(Math.max(0, startBodyGlobalIdx), endBodyGlobalIdx)
    .filter(l => l.page === 1 && l.yMin < l.pageHeight * 0.86);

  const intraParaDeltas = [];
  const interParaGaps = [];
  for (let i = 1; i < linhasTextoPag1Medicao.length; i++) {
    const dy = linhasTextoPag1Medicao[i].yMin - linhasTextoPag1Medicao[i - 1].yMin;
    if (dy <= 4 || dy > 55) continue;
    const isNewOrgan = organRegex.test(linhasTextoPag1Medicao[i].text) &&
      !/^(Obs\.?|Nota|AE|AD|OE|OD):/i.test(linhasTextoPag1Medicao[i].text);
    const isSubItem = /^(-\s+|Obs\.?|AE:|AD:)/i.test(linhasTextoPag1Medicao[i].text);
    if (!isNewOrgan && !isSubItem && dy <= 22) {
      intraParaDeltas.push(dy);
    } else if (isNewOrgan) {
      interParaGaps.push(dy);
    }
  }

  const medianIntraDy = mediana(intraParaDeltas, measuredBodyFontPt * 1.35);
  const medianInterDy = mediana(interParaGaps, medianIntraDy + 8);
  const measuredLineHeight = Math.max(1.15, Math.min(1.68, Number((medianIntraDy / measuredBodyFontPt).toFixed(2))));
  // Espaçamento extra entre categorias/parágrafos (desconta o leading natural do CSS para fidelidade visual)
  const rawExtraGapPt = Math.max(4, (medianInterDy - medianIntraDy) * 0.62);
  const measuredParaSpacingPt = Math.max(4, Math.min(18, Math.round(rawExtraGapPt)));

  const topFirstPageMm = Math.max(8, Math.min(75, Math.round(firstPatientYMin * ptToMmY)));

  // Para Página 2+, mede o início do CORPO (ignorando cabeçalho repetido se houver)
  const p2LinesAll = pagesBbox[1]?.lines || [];
  const p2BodyLines = repeatPatientHeaderOnTextPages
    ? p2LinesAll.filter(l => l.yMin > headerYCutoff && l.yMin < pageHeight * 0.88)
    : p2LinesAll.filter(l => l.yMin < pageHeight * 0.88);
  const topContinuationPagesMm = p2BodyLines.length > 0
    ? Math.max(12, Math.min(75, Math.round(p2BodyLines[0].yMin * ptToMmY)))
    : topFirstPageMm;

  // 6. Linhas de rodapé (yMin >= pageHeight * 0.86) em todas as páginas
  const getFooterLines = (pageObj) => (pageObj?.lines || []).filter(l => l.yMin >= (pageObj.height || pageHeight) * 0.86);
  const footerLinesP1 = getFooterLines(pagesBbox[0]);
  const sigPageNum = crmvLine ? crmvLine.page : (paginasTextoBbox.length || 1);
  const sigPageObj = pagesBbox[sigPageNum - 1];
  const sigFooterYMin = crmvBlock ? Math.max(crmvBlock.yMax + 25, pageHeight * 0.72) : (pageHeight * 0.86);
  const footerLinesSig = (sigPageObj?.lines || []).filter(l => l.yMin >= sigFooterYMin);
  const footerLinesRef = footerLinesSig.length > 0 ? footerLinesSig : footerLinesP1;

  const contactLines = footerLinesRef.filter(l => /CRMV|@|outlook|gmail|tel|\(\d{2}\)/i.test(l.text));
  const disclaimerLines = footerLinesRef.filter(l => !contactLines.includes(l) && l.text.trim().length > 10);

  const footerTextYMinPt = footerLinesRef.length > 0 ? Math.min(...footerLinesRef.map(l => l.yMin)) : null;
  const footerTextYMaxPt = footerLinesRef.length > 0 ? Math.max(...footerLinesRef.map(l => l.yMax)) : null;
  const bottomMarginMm = footerTextYMaxPt
    ? Math.max(8, Math.min(35, Math.round((pageHeight - footerTextYMaxPt) * ptToMmY)))
    : 20;
  const footerFontPt = disclaimerLines.length > 0
    ? Math.max(6.5, Math.min(10, Math.round(mediana(disclaimerLines.map(l => l.yMax - l.yMin), 8) * 2) / 2))
    : 8;

  // Detecta se o rodapé repete em todas as páginas de texto e nas páginas de imagens
  const footerAppearsOnP1 = footerLinesP1.length > 0;
  const mosaicFirstIdx = paginasRenderizadas.findIndex(p => p.ehMosaico);
  const footerAppearsOnImagePages = mosaicFirstIdx >= 0 && pagesBbox[mosaicFirstIdx]
    ? getFooterLines(pagesBbox[mosaicFirstIdx]).length > 0
    : false;

  // Detecta se existe linha horizontal acima do rodapé
  const footerHasTopBorder = Boolean(
    footerTextYMinPt && pag1Renderizada?.decoded &&
    detectarLinhaHorizontal(
      pag1Renderizada.decoded,
      footerTextYMinPt - 14,
      footerTextYMinPt - 1,
      xMinBody,
      xMaxBody,
      pageWidth,
      pageHeight,
      { minCoverage: 0.72, limiarLum: 225 }
    )
  );

  // Detecta se nome/CRMV estão em itálico ou negrito (heurística neutra sem hardcode de profissional)
  const sigFontPt = crmvLine
    ? Math.max(8.5, Math.min(12, Math.round((crmvLine.yMax - crmvLine.yMin) * 2) / 2))
    : 10;

  return {
    margins: {
      topFirstPage: `${topFirstPageMm}mm`,
      topContinuationPages: `${topContinuationPagesMm}mm`,
      bottom: `${bottomMarginMm}mm`,
      left: `${leftMarginMm}mm`,
      right: `${rightMarginMm}mm`
    },
    patientHeader: {
      layoutType: temBordasTabela ? 'boxed_table' : 'two_columns',
      valueCase,
      sexoAbreviado,
      bottomDivider: temDivisorInferiorReal,
      headerTopMm: Number((firstPatientYMin * ptToMmY).toFixed(1)),
      headerBottomMm: Number((lastPatientYMax * ptToMmY).toFixed(1)),
      leftOffsetMm: Number((patientXMin * ptToMmX).toFixed(1)),
      colXPositionsMm,
      fontFamily: fontes.headerFontFamily,
      fontSize: `${patientFontPt}pt`,
      labelBold: temBordasTabela,
      rows: rowsEstruturadas,
      columns: [colEsquerda, colDireita]
    },
    repeatPatientHeaderOnTextPages,
    repeatPatientHeaderOnImagePages,
    titleConfig,
    organLabelCase,
    orgaosExtraidos: orgaosExtraidos.map(o => ({
      orgao: o.orgao,
      page: o.page,
      obrigatorio: true,
      textoPadraoNormal: o.linhas.join(' ').replace(/ +\n/g, '\n').replace(/\n +/g, '\n').trim()
    })),
    firstPageOrganCount: orgaosExtraidos.filter(o => o.page === 1).length || 8,
    measuredBodyFontPt: `${measuredBodyFontPt}pt`,
    measuredLineHeight: String(measuredLineHeight),
    measuredParaSpacingPt: `${measuredParaSpacingPt}pt`,
    bodyFontFamily: fontes.bodyFontFamily,
    crmvBlock,
    patientHeaderBoxPt,
    footerTextYMaxPt,
    signatureInfo: {
      alignment: sigAlignment,
      rightOffsetMm: sigRightOffsetMm,
      hasTopLine: signatureHasTopLine,
      nomeMedico: nomeMedLine ? nomeMedLine.text.trim() : '',
      crmv: crmvLine ? crmvLine.text.trim() : '',
      textLines: [
        ...(nomeMedLine ? [{ text: nomeMedLine.text.trim(), bold: false, italic: fontes.footerItalic, fontSize: `${sigFontPt}pt` }] : []),
        ...(crmvLine ? [{ text: crmvLine.text.trim(), bold: false, italic: fontes.footerItalic, fontSize: `${sigFontPt}pt` }] : [])
      ]
    },
    footerInfo: {
      disclaimerText: disclaimerLines.map(l => l.text).join(' ').trim() || null,
      contactLines: contactLines.map(l => l.text.trim()),
      fontFamily: fontes.hasCourier ? "'Courier New', Courier, monospace" : fontes.headerFontFamily,
      fontSize: `${footerFontPt}pt`,
      italic: fontes.footerItalic,
      hasTopBorder: footerHasTopBorder,
      showOnAllTextPages: footerAppearsOnP1,
      showOnImagePages: footerAppearsOnImagePages
    },
    firstTextYMinPt: firstPatientYMin,
    pageWidthPt: pageWidth,
    pageHeightPt: pageHeight
  };
}

/**
 * Extrai de 1 a 10 PDFs todo o padrão visual (papel timbrado A4, logo lateral ou banner superior + geometria exata)
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
    // 1. Rasteriza o primeiro PDF em 300 DPI, extrai fontes reais e geometria exata via `pdftotext -bbox-layout`
    const paginasPrimeiroPdf = rasterizarPdfEmPngs(pdfsLimitados[0], pastaTemp, 7);
    const pagesBbox = extrairGeometriaBboxPdf(pdfsLimitados[0]);
    const fontes = extrairFontesPdf(pdfsLimitados[0]);
    const pag1Render = paginasPrimeiroPdf[0] || null;

    const geo = analisarEstruturaGeometricaPdf(pagesBbox, pag1Render, {
      fontes,
      paginasRenderizadas: paginasPrimeiroPdf
    });

    // 2. Extrai os ativos visuais reais (Papel timbrado A4, Logo lateral, Banner superior, Assinatura transparente e Grid de imagens)
    const ativos = extrairAtivosVisuaisDasPaginas(paginasPrimeiroPdf, pastaAtivosUsuario, {
      caminhoPdf: pdfsLimitados[0],
      pastaTemp,
      firstTextYMinPt: geo.firstTextYMinPt,
      pageWidthPt: geo.pageWidthPt,
      pageHeightPt: geo.pageHeightPt,
      patientHeaderBoxPt: geo.patientHeaderBoxPt,
      repeatPatientHeaderOnImagePages: geo.repeatPatientHeaderOnImagePages,
      footerTextYMaxPt: geo.footerTextYMaxPt,
      crmvBlock: geo.crmvBlock
    });

    // 3. Se houver múltiplos PDFs, consolida também órgãos adicionais vistos nos demais PDFs
    const mapaOrgaos = new Map();
    for (const org of geo.orgaosExtraidos) {
      mapaOrgaos.set(org.orgao.toUpperCase(), org);
    }
    for (let idx = 1; idx < pdfsLimitados.length; idx++) {
      const bboxExtra = extrairGeometriaBboxPdf(pdfsLimitados[idx]);
      const geoExtra = analisarEstruturaGeometricaPdf(bboxExtra, null, { fontes });
      for (const org of geoExtra.orgaosExtraidos) {
        if (!mapaOrgaos.has(org.orgao.toUpperCase())) {
          mapaOrgaos.set(org.orgao.toUpperCase(), org);
        }
      }
    }
    const sequenciaOrgaosConsolidada = Array.from(mapaOrgaos.values());

    // 4. Configura o Grid de Imagens de Ultrassom a partir da medição geométrica real das páginas de mosaico
    const ehStationeryFullPage = ativos.stationeryMode === 'full_page_background';
    const ehInlineLogo = ativos.stationeryMode === 'inline_logo_header';
    const gm = ativos.mosaicGridMetrics;
    const fotosPorPag = ativos.fotosPorPaginaDetectadas || (gm ? gm.columns * gm.rowsPerPage : 8);
    const rowsPerPage = gm ? gm.rowsPerPage : (fotosPorPag <= 6 ? 3 : 4);

    const imageGridConfig = gm
      ? {
          columns: gm.columns,
          rowsPerPage: gm.rowsPerPage,
          colGapMm: `${gm.colGapMm}mm`,
          rowGapMm: `${gm.rowGapMm}mm`,
          cardWidthMm: `${gm.cardWidthMm}mm`,
          cardHeightMm: `${gm.cardHeightMm}mm`,
          border: 'none',
          pagePaddingTopMm: `${gm.pagePaddingTopMm}mm`,
          pagePaddingLeftMm: `${gm.pagePaddingLeftMm}mm`,
          pagePaddingRightMm: `${gm.pagePaddingRightMm}mm`,
          pagePaddingSidesMm: `${gm.pagePaddingLeftMm}mm`,
          centerLastOddImage: Boolean(gm.centerLastOddImage)
        }
      : {
          columns: 2,
          rowsPerPage,
          colGapMm: ehStationeryFullPage ? '12.5mm' : '8mm',
          rowGapMm: ehStationeryFullPage ? '0mm' : '4mm',
          cardHeightMm: rowsPerPage === 3 ? '56.5mm' : '56mm',
          border: 'none',
          pagePaddingTopMm: ehStationeryFullPage ? geo.margins.topFirstPage : '18mm',
          pagePaddingSidesMm: geo.margins.left,
          centerLastOddImage: false
        };

    const textoCompletoOrgaos = sequenciaOrgaosConsolidada.map(o => o.textoPadraoNormal).join('\n');
    const usaTracosSubitens = /\n-\s+/.test(textoCompletoOrgaos);
    const usaObsItalico = /\bObs\.?:/i.test(textoCompletoOrgaos);
    const usaDiagDifInline = /\bDIAG\s*DIF\.?\s*:/i.test(textoCompletoOrgaos);
    const temConsideracoes = sequenciaOrgaosConsolidada.some(o => /CONSIDERA[CÇ][OÕ]ES|CONCLUS[AÃ]O|IMPRESS[AÃ]O/i.test(o.orgao));
    const temRinsResumo = sequenciaOrgaosConsolidada.some(o => /^RINS$/i.test(o.orgao)) &&
                          sequenciaOrgaosConsolidada.some(o => /^RIM\s+ESQUERDO$/i.test(o.orgao));
    const separaAdrenais = sequenciaOrgaosConsolidada.some(o => /^ADRENAL\s+ESQUERDA$/i.test(o.orgao));

    const headerMode = ehStationeryFullPage
      ? 'full_page_stationery'
      : (ehInlineLogo
          ? 'inline_logo_beside_patient'
          : (ativos.headerEhFullBleed ? 'full_bleed_banner' : (ativos.headerBannerPath ? 'centered_logo' : 'text_only')));

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
        headerLogoUrl: ativos.headerLogoPath,
        headerLogoBoxMm: ativos.headerLogoBoxMm,
        assinaturaUrl: ativos.signaturePath,
        footerLogoUrl: ativos.footerLogoPath
      },
      layoutVisual: {
        stationeryMode: ativos.stationeryMode,
        headerMode,
        headerLogoUrl: ativos.headerLogoPath,
        headerLogoBoxMm: ativos.headerLogoBoxMm,
        headerBannerHeightMm: ativos.headerBannerHeightMm,
        repeatHeaderOnTextPage2: ehStationeryFullPage || geo.repeatPatientHeaderOnTextPages || parseInt(geo.margins.topContinuationPages, 10) >= 40,
        repeatHeaderOnImagePages: ehStationeryFullPage || geo.repeatPatientHeaderOnImagePages,
        repeatPatientHeaderOnTextPages: geo.repeatPatientHeaderOnTextPages,
        repeatPatientHeaderOnImagePages: geo.repeatPatientHeaderOnImagePages,
        margins: geo.margins,
        patientHeader: geo.patientHeader,
        titleConfig: geo.titleConfig,
        bodyTypography: {
          fontFamily: geo.bodyFontFamily || 'Calibri, Carlito, Arial, sans-serif',
          fontSize: geo.measuredBodyFontPt || '10pt',
          lineHeight: geo.measuredLineHeight || '1.35',
          paragraphSpacing: geo.measuredParaSpacingPt || '10pt',
          textAlign: 'justify',
          organLabelCase: geo.organLabelCase,
          organLabelBold: true,
          paginationMode: 'two_page_flow',
          firstPageOrganCount: geo.firstPageOrganCount
        },
        signatureConfig: {
          alignment: geo.signatureInfo.alignment,
          paddingRightMm: geo.signatureInfo.alignment === 'right' ? `${geo.signatureInfo.rightOffsetMm}mm` : '0mm',
          marginTopMm: '10mm',
          hasTopLine: geo.signatureInfo.hasTopLine,
          order: ativos.signaturePositionOrder,
          textLines: geo.signatureInfo.textLines,
          signatureImageHeightMm: `${ativos.signatureImageHeightMm || (ativos.signaturePositionOrder === 'image_above_text' ? 16 : 18)}mm`
        },
        footerConfig: {
          showOnTextPages: ehStationeryFullPage
            ? 'baked_in_stationery'
            : (geo.footerInfo.showOnAllTextPages ? 'all_text_pages' : 'last_text_page_disclaimer_all_text_pages_logo'),
          showOnImagePages: ehStationeryFullPage || geo.footerInfo.showOnImagePages,
          disclaimerText: geo.footerInfo.disclaimerText,
          disclaimerFontFamily: geo.footerInfo.fontFamily,
          disclaimerFontSize: geo.footerInfo.fontSize,
          disclaimerItalic: geo.footerInfo.italic,
          hasTopBorder: geo.footerInfo.hasTopBorder,
          dividerStyle: geo.footerInfo.hasTopBorder ? 'solid' : 'none',
          contactLines: geo.footerInfo.contactLines,
          contactFontFamily: geo.footerInfo.fontFamily,
          contactFontSize: geo.footerInfo.fontSize,
          showFooterLogo: Boolean(ativos.footerLogoPath)
        },
        imageGridConfig
      },
      estiloEscritaClinica: {
        usarDiagDifSeparado: usaDiagDifInline,
        usarTopicoConsideracoesSeparado: temConsideracoes,
        usarSubitensComTraco: usaTracosSubitens,
        usarObsItalico: usaObsItalico,
        formatoConclusao: temConsideracoes ? 'TOPICO_INLINE' : 'INLINE_NO_ORGAO',
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
  normalizarRotuloResponsavel,
  extrairFontesPdf,
  extrairGeometriaBboxPdf,
  analisarEstruturaGeometricaPdf,
  extrairPadraoCompletoDePdfs
};
