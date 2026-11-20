const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  PageBreak,
  Header,
  Footer,
  UnderlineType,
  VerticalAlign,
  TableLayoutType
} = require('docx');
const { obterLayout, converterParaDocx, medidaParaTwips, ptParaHalfPoints } = require('./gerenciador_layout');
const { normalizarRotuloResponsavel } = require('./extrator_padrao_laudo');

function resolverCaminhoArquivo(caminho) {
  if (!caminho || typeof caminho !== 'string') return null;
  const limpo = caminho.trim();
  if (!limpo) return null;

  if (fs.existsSync(limpo)) return path.resolve(limpo);

  const semApp = limpo.replace(/^\/app\//, '').replace(/^app\//, '');
  if (fs.existsSync(semApp)) return path.resolve(semApp);
  if (fs.existsSync(path.join(__dirname, semApp))) return path.resolve(path.join(__dirname, semApp));

  const semBarra = limpo.replace(/^\/+/, '');
  if (fs.existsSync(semBarra)) return path.resolve(semBarra);
  if (fs.existsSync(path.join(__dirname, semBarra))) return path.resolve(path.join(__dirname, semBarra));

  const resolvidoCwd = path.resolve(process.cwd(), semBarra);
  if (fs.existsSync(resolvidoCwd)) return resolvidoCwd;

  return null;
}

const A4_WIDTH_TWIPS = 11906;  // 210mm
const A4_HEIGHT_TWIPS = 16838; // 297mm
const MM_TO_TWIPS = 56.6929;
const MM_TO_PX_96DPI = 96 / 25.4; // ~3.7795 px/mm (unidade usada pelo ImageRun do pacote docx)

function mmParaPx(mmVal, fallbackMm = 40) {
  const n = parseFloat(String(mmVal ?? ''));
  const mm = isNaN(n) ? fallbackMm : n;
  return Math.max(10, Math.round(mm * MM_TO_PX_96DPI));
}

function mmParaTwips(mmVal, fallbackTwips = 1134) {
  if (typeof mmVal === 'number' && !isNaN(mmVal)) {
    return Math.round(mmVal * MM_TO_TWIPS);
  }
  return medidaParaTwips(String(mmVal || ''), fallbackTwips);
}

/**
 * Lê largura e altura reais (em pixels) de um PNG ou JPEG sem dependências externas,
 * garantindo que nenhuma imagem (logo, banner, assinatura ou foto de ultrassom) seja distorcida no Word.
 */
function lerDimensoesImagem(buffer) {
  if (!buffer || buffer.length < 24) return null;
  // PNG: assinatura 89 50 4E 47 0D 0A 1A 0A -> IHDR width em 16..19, height em 20..23
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  // JPEG: percorre marcadores SOF0..SOF2
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      if (offset + 3 >= buffer.length) break;
      const len = buffer.readUInt16BE(offset + 2);
      if (len < 2) break;
      offset += 2 + len;
    }
  }
  return null;
}

/**
 * Calcula dimensões proporcionais em px (96 DPI) para o ImageRun preservando aspect ratio original.
 */
function calcularTransformacaoProporcional(buffer, { targetWidthPx = null, targetHeightPx = null, maxWidthPx = null, maxHeightPx = null }) {
  const dims = lerDimensoesImagem(buffer);
  if (!dims || !dims.width || !dims.height) {
    return {
      width: Math.round(targetWidthPx || maxWidthPx || 140),
      height: Math.round(targetHeightPx || maxHeightPx || 60)
    };
  }
  const ratio = dims.width / dims.height;
  let w;
  let h;

  if (targetWidthPx && !targetHeightPx) {
    w = targetWidthPx;
    h = w / ratio;
  } else if (targetHeightPx && !targetWidthPx) {
    h = targetHeightPx;
    w = h * ratio;
  } else if (targetWidthPx && targetHeightPx) {
    // Encaixa dentro do retângulo mantendo proporção
    const scale = Math.min(targetWidthPx / dims.width, targetHeightPx / dims.height);
    w = dims.width * scale;
    h = dims.height * scale;
  } else {
    w = dims.width;
    h = dims.height;
  }

  if (maxWidthPx && w > maxWidthPx) {
    w = maxWidthPx;
    h = w / ratio;
  }
  if (maxHeightPx && h > maxHeightPx) {
    h = maxHeightPx;
    w = h * ratio;
  }

  return {
    width: Math.max(8, Math.round(w)),
    height: Math.max(8, Math.round(h))
  };
}

function formatarNomeOrgaoDocx(orgaoRaw, caseMode = 'UPPERCASE') {
  const limpo = String(orgaoRaw || '').replace(/:+$/, '').trim();
  if (!limpo) return '';
  if (caseMode === 'SENTENCE_CASE') {
    const lower = limpo.toLowerCase();
    if (limpo !== limpo.toUpperCase() && limpo !== limpo.toLowerCase()) return limpo;
    if (lower === 'alças intestinais' || lower === 'alcas intestinais') return 'Alças Intestinais';
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return limpo.toUpperCase();
}

function extrairNomeFontePrincipal(fontFamilyStr, fallback = 'Calibri') {
  if (!fontFamilyStr || typeof fontFamilyStr !== 'string') return fallback;
  return fontFamilyStr.split(',')[0].replace(/['"]/g, '').trim() || fallback;
}

const SEM_BORDAS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' }
};

function montarMapaValoresPaciente(dados, pHeader) {
  const upper = pHeader?.valueCase === 'UPPERCASE';
  const fmt = (val, def = '', preservarDr = false) => {
    const s = String(val !== undefined && val !== null && val !== '' ? val : def).trim();
    if (preservarDr && /^dr\s*\(a\)$/i.test(s)) return 'Dr (a)';
    return upper ? s.toUpperCase() : s;
  };

  let sexoBruto = String(dados.sexo || '').trim();
  if (pHeader?.sexoAbreviado) {
    if (/^f/i.test(sexoBruto)) sexoBruto = 'F';
    else if (/^m/i.test(sexoBruto)) sexoBruto = 'M';
  }

  return {
    fmt,
    mapa: {
      data: fmt(dados.data, ''),
      nome: fmt(dados.nome || dados.paciente, ''),
      sexo: fmt(sexoBruto, ''),
      especie: fmt(dados.especie, upper ? 'CANINA' : 'Canina'),
      requisitante: fmt(dados.requisitante, '', true),
      idade: fmt(dados.idade, upper ? 'NÃO INFORMADA' : 'Não informada'),
      tutor: fmt(dados.tutor || dados.proprietario, ''),
      raca: fmt(dados.raca, 'SRD')
    }
  };
}

/**
 * Constrói o bloco de cabeçalho com logo lateral ao lado dos dados do paciente (`inline_logo_header`),
 * fiel ao PDF (logo à esquerda ou direita + colunas de metadados sem bordas indesejadas).
 */
function criarCabecalhoInlineLogoDocx(dados, headerLogoPath, visual, fonteCorpo) {
  const pHeader = visual?.patientHeader || {};
  const logoBox = visual?.headerLogoBoxMm || { side: 'left', widthMm: 34, heightMm: 15.6 };
  const fonteCabecalho = extrairNomeFontePrincipal(pHeader.fontFamily, fonteCorpo || 'Arial');
  const szCab = ptParaHalfPoints(pHeader.fontSize || '10pt', 20);
  const labelBold = Boolean(pHeader.labelBold);
  const { fmt, mapa } = montarMapaValoresPaciente(dados, pHeader);

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

  const logoCellChildren = [];
  if (headerLogoPath && fs.existsSync(headerLogoPath)) {
    const logoBuf = fs.readFileSync(headerLogoPath);
    const trans = calcularTransformacaoProporcional(logoBuf, {
      targetWidthPx: mmParaPx(logoBox.widthMm || 34, 34),
      targetHeightPx: mmParaPx(logoBox.heightMm || 16, 16)
    });
    logoCellChildren.push(
      new Paragraph({
        alignment: logoBox.side === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            data: logoBuf,
            transformation: trans
          })
        ]
      })
    );
  } else {
    logoCellChildren.push(new Paragraph({ text: '' }));
  }

  const celulaLogo = new TableCell({
    width: { size: 24, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 0, bottom: 0, left: 0, right: 120 },
    children: logoCellChildren
  });

  const larguraPorCol = Math.floor(76 / Math.max(1, colsEfetivas.length));
  const celulasMetadados = colsEfetivas.map((col, idx) => {
    const pars = col.map((c) => {
      const rotulo = normalizarRotuloResponsavel(c.label);
      const valor = mapa[c.key] ?? fmt(dados[c.key], c.default || '');
      return new Paragraph({
        spacing: { before: 0, after: 20, line: 260 },
        children: [
          new TextRun({ text: `${rotulo} `, bold: labelBold, size: szCab, font: fonteCabecalho, color: '111111' }),
          new TextRun({ text: valor, size: szCab, font: fonteCabecalho, color: '111111' })
        ]
      });
    });
    return new TableCell({
      width: { size: larguraPorCol, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 0, bottom: 0, left: idx === 0 ? 120 : 80, right: 40 },
      children: pars
    });
  });

  const temDivisor = pHeader.bottomDivider === true || (
    typeof pHeader.bottomDivider === 'object' && pHeader.bottomDivider !== null && pHeader.bottomDivider.enabled === true
  );

  const celulasLinha = logoBox.side === 'right'
    ? [...celulasMetadados, celulaLogo]
    : [celulaLogo, ...celulasMetadados];

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        ...SEM_BORDAS,
        bottom: temDivisor
          ? { style: BorderStyle.SINGLE, size: 6, color: '000000' }
          : { style: BorderStyle.NONE, size: 0, color: 'auto' }
      },
      rows: [new TableRow({ children: celulasLinha })]
    })
  ];
}

/**
 * Constrói o cabeçalho padrão (sem modo clonado).
 */
function criarCabecalhoDocx(dados, logoPath, cfgDocx) {
  const fonte = (cfgDocx && cfgDocx.fontFamily) || 'Calibri';
  const szCabecalho = 20;

  const celulas = [];
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    const trans = calcularTransformacaoProporcional(logoBuffer, { maxWidthPx: 130, maxHeightPx: 54 });
    celulas.push(
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: trans
              })
            ]
          })
        ]
      })
    );
  }

  const larguraColEsq = celulas.length > 0 ? 38 : 50;
  const larguraColDir = celulas.length > 0 ? 34 : 50;

  celulas.push(
    new TableCell({
      width: { size: larguraColEsq, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Nome: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.nome || '', size: szCabecalho, font: fonte })] }),
        new Paragraph({ children: [new TextRun({ text: 'Espécie: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.especie || '', size: szCabecalho, font: fonte })] }),
        new Paragraph({ children: [new TextRun({ text: 'Idade: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.idade || 'Não informada', size: szCabecalho, font: fonte })] })
      ]
    }),
    new TableCell({
      width: { size: larguraColDir, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Responsável: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.tutor || '', size: szCabecalho, font: fonte })] }),
        new Paragraph({ children: [new TextRun({ text: 'Sexo: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.sexo || '', size: szCabecalho, font: fonte })] }),
        new Paragraph({ children: [new TextRun({ text: 'Data: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.data || '', size: szCabecalho, font: fonte })] })
      ]
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      ...SEM_BORDAS,
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
    },
    rows: [new TableRow({ children: celulas })]
  });
}

/**
 * Constrói o cabeçalho clonado para layouts com banner superior ou papel timbrado (`boxed_table` / `two_columns`).
 */
function criarCabecalhoClonadoDocx(dados, headerBannerPath, visual, fonteCorpo, larguraUtilMm = 170) {
  const elementos = [];
  if (headerBannerPath && fs.existsSync(headerBannerPath)) {
    const bannerBuffer = fs.readFileSync(headerBannerPath);
    const trans = calcularTransformacaoProporcional(bannerBuffer, {
      targetWidthPx: mmParaPx(larguraUtilMm, 170),
      maxHeightPx: mmParaPx(visual?.headerBannerHeightMm || 52, 52)
    });
    elementos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 140 },
        children: [
          new ImageRun({
            data: bannerBuffer,
            transformation: trans
          })
        ]
      })
    );
  }

  const pHeader = visual?.patientHeader || visual?.patientGrid || {
    layoutType: 'boxed_table',
    valueCase: 'TITLE_CASE',
    sexoAbreviado: false,
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

  const fonteCabecalho = extrairNomeFontePrincipal(pHeader.fontFamily, fonteCorpo || 'Calibri');
  const sz = ptParaHalfPoints(pHeader.fontSize || '11pt', 22);
  const labelBold = pHeader.layoutType === 'boxed_table' ? true : Boolean(pHeader.labelBold);
  const { fmt, mapa } = montarMapaValoresPaciente(dados, pHeader);

  if (pHeader.layoutType === 'boxed_table' && Array.isArray(pHeader.rows) && pHeader.rows.length > 0) {
    const docxRows = pHeader.rows.map((rowCells) => {
      const cells = rowCells.map((c) => {
        const w = c.widthPct || Math.floor(100 / Math.max(1, rowCells.length));
        const rotulo = normalizarRotuloResponsavel(c.label);
        return new TableCell({
          width: { size: w, type: WidthType.PERCENTAGE },
          margins: { top: 45, bottom: 45, left: 90, right: 90 },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({ text: `${rotulo} `, bold: true, size: sz, font: fonteCabecalho }),
                new TextRun({ text: mapa[c.key] ?? fmt(dados[c.key], ''), size: sz, font: fonteCabecalho })
              ]
            })
          ]
        });
      });
      return new TableRow({ children: cells });
    });

    elementos.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: '9E9E9E' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: '9E9E9E' },
          left: { style: BorderStyle.SINGLE, size: 4, color: '9E9E9E' },
          right: { style: BorderStyle.SINGLE, size: 4, color: '9E9E9E' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '9E9E9E' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '9E9E9E' }
        },
        rows: docxRows
      })
    );
  } else {
    const cols = (Array.isArray(pHeader.columns) && pHeader.columns.length > 0)
      ? pHeader.columns.filter(c => Array.isArray(c) && c.length > 0)
      : [
          [{ key: 'nome', label: 'Nome:' }, { key: 'especie', label: 'Espécie:' }, { key: 'idade', label: 'Idade:' }],
          [{ key: 'tutor', label: 'Responsável:' }, { key: 'sexo', label: 'Sexo:' }, { key: 'data', label: 'Data:' }]
        ];

    const tableCells = cols.map((col) => {
      const pars = col.map((c) => {
        const rotulo = normalizarRotuloResponsavel(c.label);
        return new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({ text: `${rotulo} `, bold: labelBold, size: sz, font: fonteCabecalho }),
            new TextRun({ text: mapa[c.key] ?? fmt(dados[c.key], c.default || ''), size: sz, font: fonteCabecalho })
          ]
        });
      });
      return new TableCell({
        width: { size: Math.floor(100 / Math.max(1, cols.length)), type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 80, left: 60, right: 60 },
        children: pars
      });
    });

    const temDivisor = pHeader.bottomDivider === true || (
      typeof pHeader.bottomDivider === 'object' && pHeader.bottomDivider !== null && pHeader.bottomDivider.enabled === true
    );

    elementos.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          ...SEM_BORDAS,
          bottom: temDivisor
            ? { style: BorderStyle.SINGLE, size: 6, color: '000000' }
            : { style: BorderStyle.NONE, size: 0, color: 'auto' }
        },
        rows: [new TableRow({ children: tableCells })]
      })
    );
  }

  return elementos;
}

/**
 * Monta os TextRuns de uma linha de texto, colocando `DIAG DIF.: ...` em itálico quando habilitado.
 */
function criarRunsLinhaOrgao(linha, { szCorpo, fonte, usarDiagDif, breakBefore = false, ehObs = false }) {
  if (ehObs) {
    return [
      new TextRun({
        text: linha,
        break: breakBefore ? 1 : undefined,
        italics: true,
        size: 17,
        font: fonte
      })
    ];
  }

  if (usarDiagDif && /DIAG\s*DIF\.?\s*:/i.test(linha)) {
    const match = linha.match(/^(.*?)(DIAG\s*DIF\.?\s*:.*)$/i);
    if (match) {
      const runs = [];
      if (match[1]) {
        runs.push(new TextRun({
          text: match[1],
          break: breakBefore ? 1 : undefined,
          size: szCorpo,
          font: fonte
        }));
      }
      runs.push(new TextRun({
        text: match[2],
        break: (!match[1] && breakBefore) ? 1 : undefined,
        italics: true,
        size: szCorpo,
        font: fonte
      }));
      return runs;
    }
  }

  return [
    new TextRun({
      text: linha,
      break: breakBefore ? 1 : undefined,
      size: szCorpo,
      font: fonte
    })
  ];
}

/**
 * Constrói o rodapé fiel do documento Word (disclaimer, contatos opcionais e mini-logo opcional).
 */
function criarRodapeDocx(usarModoClonado, visual, footerLogoPath, textoAvisoFallback, fontePadrao) {
  const fCfg = visual?.footerConfig || {};
  const rodapeChildren = [];

  const disclaimerText = usarModoClonado
    ? (fCfg.disclaimerText || null)
    : (textoAvisoFallback || 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.');

  const fonteRodape = extrairNomeFontePrincipal(fCfg.disclaimerFontFamily, fontePadrao || 'Arial');
  const szRodape = ptParaHalfPoints(fCfg.disclaimerFontSize || '8pt', 16);
  const rodapeItalico = usarModoClonado ? (fCfg.disclaimerItalic !== false) : true;
  const temBordaSuperior = usarModoClonado ? Boolean(fCfg.hasTopBorder) : true;

  if (disclaimerText) {
    rodapeChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: temBordaSuperior
          ? {
              top: {
                style: BorderStyle.SINGLE,
                size: 4,
                color: 'CCCCCC',
                space: 4
              }
            }
          : undefined,
        spacing: { before: 40, after: 40, line: 250 },
        children: [
          new TextRun({
            text: disclaimerText,
            italics: rodapeItalico,
            size: szRodape,
            color: usarModoClonado ? '111111' : '555555',
            font: fonteRodape
          })
        ]
      })
    );
  }

  const linhasContatoEfetivasDocx = (usarModoClonado && Array.isArray(fCfg.contactLines))
    ? fCfg.contactLines.filter(l => !/CRMV/i.test(l) && !/(m[eé]dic[oa]|veterin[aá]ri[oa]|dra?\.)/i.test(l))
    : [];

  if (linhasContatoEfetivasDocx.length > 0) {
    const fonteContato = extrairNomeFontePrincipal(fCfg.contactFontFamily, fonteRodape);
    const szContato = ptParaHalfPoints(fCfg.contactFontSize || '8.5pt', 17);
    linhasContatoEfetivasDocx.forEach((linha, idx) => {
      rodapeChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: idx === 0
            ? {
                top: {
                  style: fCfg.dividerStyle === 'solid' ? BorderStyle.SINGLE : BorderStyle.DASHED,
                  size: 6,
                  color: '333333',
                  space: 4
                }
              }
            : undefined,
          spacing: { before: idx === 0 ? 40 : 10, after: 10 },
          children: [
            new TextRun({
              text: linha,
              size: szContato,
              color: '111111',
              font: fonteContato
            })
          ]
        })
      );
    });
  }

  if (usarModoClonado && fCfg.showFooterLogo && footerLogoPath && fs.existsSync(footerLogoPath)) {
    const flBuf = fs.readFileSync(footerLogoPath);
    const trans = calcularTransformacaoProporcional(flBuf, { targetHeightPx: mmParaPx(9.5, 9.5), maxWidthPx: 140 });
    rodapeChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 0 },
        children: [
          new ImageRun({
            data: flBuf,
            transformation: trans
          })
        ]
      })
    );
  }

  if (rodapeChildren.length === 0) return null;
  return new Footer({ children: rodapeChildren });
}

async function gerarDocxLaudo(dados, laudo, caminhoSaida, logoPath, imagensPaths = [], customLayout = null, opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = customLayout || await obterLayout(opcoes.usuarioId || usuario.id || null);
  const cfgDocx = converterParaDocx(layout);

  const usarModoClonado = Boolean(layout?.modo_template === 'clonado_pdf' || layout?.visual_config_json);
  const visual = layout?.visual_config_json || {};
  const escrita = layout?.writing_style_json || {};
  const templateVisual = opcoes.templateVisual || opcoes.perfilLaudo?.templateVisual || {};

  const bTypo = visual.bodyTypography || {};
  const tCfg = visual.titleConfig || {};
  const sCfg = visual.signatureConfig || {};
  const margins = visual.margins || {};

  const fonte = usarModoClonado
    ? extrairNomeFontePrincipal(bTypo.fontFamily || layout.font_family, 'Calibri')
    : (cfgDocx.fontFamily || 'Calibri');
  const szCorpo = usarModoClonado
    ? ptParaHalfPoints(bTypo.fontSize || layout.font_size_body || '10pt', 20)
    : (cfgDocx.szCorpo || 22);
  const szTitulo = usarModoClonado
    ? ptParaHalfPoints(tCfg.fontSize || layout.font_size_titulo || '12pt', 24)
    : (cfgDocx.szTitulo || 24);
  const spacingAfterCorpo = usarModoClonado
    ? medidaParaTwips(bTypo.paragraphSpacing || layout.paragraph_spacing || '12pt', 240)
    : cfgDocx.spacingAfter;
  const lineSpacingCorpo = Math.round((parseFloat(bTypo.lineHeight || layout.line_height) || 1.35) * 240);

  const headerLogoPath = resolverCaminhoArquivo(layout?.header_logo_url) ||
    resolverCaminhoArquivo(visual?.headerLogoUrl) ||
    resolverCaminhoArquivo(usuario?.logoUrl) ||
    resolverCaminhoArquivo(logoPath) ||
    resolverCaminhoArquivo(opcoes.perfilLaudo?.templateVisual?.headerLogoUrl) ||
    null;
  const headerBannerPath = resolverCaminhoArquivo(layout?.header_banner_url) || resolverCaminhoArquivo(visual?.headerBannerUrl) || null;
  const footerLogoPath = resolverCaminhoArquivo(layout?.footer_logo_url) || resolverCaminhoArquivo(visual?.footerLogoUrl) || null;
  const assinaturaPath = resolverCaminhoArquivo(opcoes.assinaturaPath) ||
    resolverCaminhoArquivo(layout?.assinatura_extraida_url) ||
    resolverCaminhoArquivo(visual?.assinaturaUrl) ||
    resolverCaminhoArquivo(usuario?.assinaturaUrl) ||
    resolverCaminhoArquivo(opcoes.perfilLaudo?.templateVisual?.assinaturaUrl) ||
    null;

  const ehInlineLogoHeader = Boolean(
    usarModoClonado &&
    (visual.stationeryMode === 'inline_logo_header' || visual.headerMode === 'inline_logo_beside_patient')
  );
  const repetirCabecalhoInline = Boolean(
    ehInlineLogoHeader &&
    (visual.repeatPatientHeaderOnTextPages || visual.repeatHeaderOnTextPage2 || visual.repeatPatientHeaderOnImagePages)
  );

  // Margens A4 exatas em twips
  const leftMm = parseFloat(String(margins.left || layout.margin_left || '20')) || 20;
  const rightMm = parseFloat(String(margins.right || layout.margin_right || '20')) || 20;
  const larguraUtilMm = Math.max(120, 210 - leftMm - rightMm);

  const marginLeftTwips = mmParaTwips(margins.left || layout.margin_left || '20mm', 1134);
  const marginRightTwips = mmParaTwips(margins.right || layout.margin_right || '20mm', 1134);
  const marginBottomTwips = mmParaTwips(margins.bottom || layout.margin_bottom || '16mm', 907);

  // Quando o cabeçalho inline se repete via Word Header, o margin.top abre espaço limpo abaixo do cabeçalho
  const logoBox = visual.headerLogoBoxMm || { yMm: 10, heightMm: 15.6 };
  const pHeaderBottomMm = visual.patientHeader?.headerBottomMm || 22;
  const inlineHeaderBottomMm = Math.max(pHeaderBottomMm, (logoBox.yMm || 10) + (logoBox.heightMm || 16));
  const marginTopTwips = repetirCabecalhoInline
    ? mmParaTwips(inlineHeaderBottomMm + 5, 1700)
    : (usarModoClonado && headerBannerPath
        ? mmParaTwips(8, 454)
        : mmParaTwips(margins.topFirstPage || layout.margin_top || '20mm', 1134));
  const headerDistTwips = mmParaTwips(Math.max(6, (visual.patientHeader?.headerTopMm || 10) - 2), 454);

  const tituloDocx = templateVisual.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL';
  const subtituloDocx = templateVisual.subtituloDocumento !== undefined
    ? templateVisual.subtituloDocumento
    : 'Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo';
  const textoAvisoLegal = templateVisual.textoAvisoLegal || '';

  const nomeExtraido = sCfg.textLines?.[0]?.text || '';
  const crmvExtraido = sCfg.textLines?.[1]?.text || '';
  const nomeMedico = opcoes.nomeMedico || nomeExtraido || usuario.nome || 'Médico(a) Veterinário(a)';
  const crmvMedico = opcoes.crmvMedico || crmvExtraido || usuario.crmv || '';

  const children = [];
  let wordHeaderDefault = null;

  if (usarModoClonado) {
    if (ehInlineLogoHeader) {
      const headerNodes = criarCabecalhoInlineLogoDocx(dados, headerLogoPath, visual, fonte);
      if (repetirCabecalhoInline) {
        // Coloca no cabeçalho nativo do Word -> repete automaticamente em TODAS as páginas editáveis!
        wordHeaderDefault = new Header({ children: headerNodes });
      } else {
        children.push(...headerNodes);
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
    } else {
      children.push(...criarCabecalhoClonadoDocx(dados, headerBannerPath, visual, fonte, larguraUtilMm));
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    }

    if (tCfg.showTextTitle !== false && tCfg.text) {
      const fonteTitulo = extrairNomeFontePrincipal(tCfg.fontFamily, fonte);
      children.push(
        new Paragraph({
          alignment: tCfg.alignment === 'left' ? AlignmentType.LEFT : AlignmentType.CENTER,
          spacing: {
            before: repetirCabecalhoInline ? 40 : mmParaTwips(tCfg.marginTopMm || '4mm', 220),
            after: tCfg.subtitle ? 40 : mmParaTwips(tCfg.marginBottomMm || '6mm', 280)
          },
          children: [
            new TextRun({
              text: tCfg.text,
              bold: tCfg.bold !== false,
              underline: tCfg.underline ? { type: UnderlineType.SINGLE } : undefined,
              size: szTitulo,
              font: fonteTitulo,
              color: (tCfg.color || '#000000').replace(/^#/, '')
            })
          ]
        })
      );

      if (tCfg.subtitle) {
        const szSub = ptParaHalfPoints(tCfg.subtitleFontSize || '8pt', 16);
        children.push(
          new Paragraph({
            alignment: tCfg.alignment === 'left' ? AlignmentType.LEFT : AlignmentType.CENTER,
            spacing: { before: 0, after: mmParaTwips(tCfg.marginBottomMm || '6mm', 280), line: 250 },
            children: [
              new TextRun({
                text: tCfg.subtitle,
                italics: true,
                size: szSub,
                font: fonteTitulo,
                color: '111111'
              })
            ]
          })
        );
      }
    }
  } else {
    children.push(criarCabecalhoDocx(dados, logoPath, cfgDocx));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: tituloDocx,
            bold: true,
            size: szTitulo,
            font: fonte,
            color: cfgDocx.corPrimariaHex || '1B365D'
          })
        ]
      })
    );

    if (subtituloDocx) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: subtituloDocx,
              italics: true,
              size: 16,
              font: fonte,
              color: cfgDocx.corSecundariaHex || '4A777A'
            })
          ]
        })
      );
    }
  }

  // Filtragem de órgãos compatível com o PDF (sexo oposto + considerações)
  const ehFemea = /^(f|f[eê]mea)/i.test(String(dados.sexo || '').trim());
  const ehMacho = /^(m|macho)/i.test(String(dados.sexo || '').trim()) && !ehFemea;

  const laudoFiltrado = (laudo || []).filter((item) => {
    const orgNorm = String(item.orgao || '').toUpperCase();
    if (!usarModoClonado || escrita.omitirOrgaosSexoOposto !== false) {
      if (ehFemea && (orgNorm.includes('PROSTATA') || orgNorm.includes('PRÓSTATA') || orgNorm.includes('TESTICULO') || orgNorm.includes('TESTÍCULO'))) {
        return false;
      }
      if (ehMacho && (orgNorm.includes('UTERO') || orgNorm.includes('ÚTERO') || orgNorm.includes('OVARIO') || orgNorm.includes('OVÁRIO'))) {
        return false;
      }
    }
    if (usarModoClonado && escrita.usarTopicoConsideracoesSeparado === false && /CONSIDERA[CÇ][OÕ]ES/i.test(orgNorm)) {
      return false;
    }
    return true;
  });

  const usarDiagDif = usarModoClonado ? (escrita?.usarDiagDifSeparado !== false) : true;
  const organLabelCase = usarModoClonado ? (bTypo.organLabelCase || 'UPPERCASE') : 'UPPERCASE';
  const alinhamentoCorpo = (usarModoClonado && bTypo.textAlign === 'left')
    ? AlignmentType.LEFT
    : AlignmentType.JUSTIFIED;

  laudoFiltrado.forEach(item => {
    const orgaoLabel = formatarNomeOrgaoDocx(item.orgao, organLabelCase);
    const regexOrgao = new RegExp(`^${String(item.orgao || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s-]*`, 'i');
    let textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();
    textoLimpo = textoLimpo.replace(/(DIAG\s*DIF\.?\s*:\s*){2,}/gi, 'DIAG DIF.: ');
    if (!usarDiagDif) {
      textoLimpo = textoLimpo.replace(/\s*DIAG\s*DIF\.?\s*:[^\n]*$/gi, '').trim();
    }

    const linhas = textoLimpo.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const runs = [
      new TextRun({ text: `${orgaoLabel}: `, bold: true, size: szCorpo, font: fonte })
    ];

    linhas.forEach((linha, idx) => {
      const ehObs = idx > 0 && /^Obs\.?:/i.test(linha);
      runs.push(...criarRunsLinhaOrgao(linha, {
        szCorpo,
        fonte,
        usarDiagDif,
        breakBefore: idx > 0,
        ehObs
      }));
    });

    if (usarDiagDif && item.diagDif && item.diagDif.trim() !== '') {
      const diagLimpo = item.diagDif.replace(/^(\s*DIAG\s*DIF\.?\s*:?\s*)+/i, '').trim();
      if (diagLimpo && !textoLimpo.toUpperCase().includes('DIAG DIF')) {
        runs.push(new TextRun({ text: ` DIAG DIF.: ${diagLimpo}`, italics: true, size: szCorpo, font: fonte }));
      }
    }

    children.push(
      new Paragraph({
        alignment: alinhamentoCorpo,
        spacing: { after: spacingAfterCorpo, line: lineSpacingCorpo },
        children: runs
      })
    );
  });

  // Assinatura fiel ao PDF (proporção real da rubrica, alinhamento, itálico/negrito e linha condicional)
  children.push(new Paragraph({ text: '', spacing: { after: 80 } }));

  const alinhamentoAssinatura = (usarModoClonado && sCfg.alignment === 'center')
    ? AlignmentType.CENTER
    : ((usarModoClonado && sCfg.alignment === 'left') ? AlignmentType.LEFT : AlignmentType.RIGHT);

  const nomeBold = sCfg.textLines?.[0]?.bold !== undefined ? Boolean(sCfg.textLines[0].bold) : !usarModoClonado;
  const nomeItalic = Boolean(sCfg.textLines?.[0]?.italic);
  const crmvBold = Boolean(sCfg.textLines?.[1]?.bold);
  const crmvItalic = Boolean(sCfg.textLines?.[1]?.italic);
  const szSigNome = ptParaHalfPoints(sCfg.textLines?.[0]?.fontSize || '10pt', 20);
  const szSigCrmv = ptParaHalfPoints(sCfg.textLines?.[1]?.fontSize || '10pt', 20);

  const linhaAssinaturaParagrafo = (usarModoClonado && sCfg.hasTopLine)
    ? new Paragraph({
        alignment: alinhamentoAssinatura,
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({ text: '________________________________', size: 18, color: '444444', font: fonte })
        ]
      })
    : null;

  const paragrafosTextoAssinatura = [
    new Paragraph({
      alignment: alinhamentoAssinatura,
      spacing: { before: 0, after: 20 },
      children: [
        new TextRun({
          text: nomeMedico,
          bold: nomeBold,
          italics: nomeItalic,
          size: szSigNome,
          font: fonte
        })
      ]
    }),
    ...(crmvMedico ? [
      new Paragraph({
        alignment: alinhamentoAssinatura,
        spacing: { before: 0, after: 20 },
        children: [
          new TextRun({
            text: crmvMedico,
            bold: crmvBold,
            italics: crmvItalic,
            size: szSigCrmv,
            font: fonte
          })
        ]
      })
    ] : [])
  ];

  let paragrafoImgAssinatura = null;
  if (assinaturaPath && fs.existsSync(assinaturaPath)) {
    const sigBuf = fs.readFileSync(assinaturaPath);
    const sigHeightMm = parseFloat(String(sCfg.signatureImageHeightMm || '15')) || 15;
    const transSig = calcularTransformacaoProporcional(sigBuf, {
      targetHeightPx: mmParaPx(sigHeightMm, 15),
      maxWidthPx: 180
    });
    paragrafoImgAssinatura = new Paragraph({
      alignment: alinhamentoAssinatura,
      spacing: { before: 0, after: 30 },
      children: [
        new ImageRun({
          data: sigBuf,
          transformation: transSig
        })
      ]
    });
  }

  if (usarModoClonado && sCfg.order === 'text_above_image') {
    if (linhaAssinaturaParagrafo) children.push(linhaAssinaturaParagrafo);
    children.push(...paragrafosTextoAssinatura);
    if (paragrafoImgAssinatura) children.push(paragrafoImgAssinatura);
  } else {
    if (paragrafoImgAssinatura) children.push(paragrafoImgAssinatura);
    if (linhaAssinaturaParagrafo) children.push(linhaAssinaturaParagrafo);
    children.push(...paragrafosTextoAssinatura);
  }

  // Grade de imagens de ultrassom fiel ao PDF (colunas, linhas, dimensões proporcionais, gaps e foto final centralizada)
  if (imagensPaths && imagensPaths.length > 0) {
    const imgCfg = visual?.imageGridConfig || {};
    const cols = Math.max(1, Math.min(3, imgCfg.columns || 2));
    const rowsPerPage = imgCfg.rowsPerPage || 4;
    const fotosPorPagina = cols * rowsPerPage;

    const colGapMm = parseFloat(String(imgCfg.colGapMm || '8')) || 8;
    const rowGapMm = parseFloat(String(imgCfg.rowGapMm || '4')) || 4;
    const cardHeightMm = parseFloat(String(imgCfg.cardHeightMm || '56')) || 56;
    const cardWidthMm = parseFloat(String(imgCfg.cardWidthMm || '')) || ((larguraUtilMm - colGapMm * (cols - 1)) / cols);
    const cardWidthEfetivaMm = Math.min(cardWidthMm, (larguraUtilMm - 4) / cols);

    const padH = Math.max(20, Math.round((colGapMm / 2) * MM_TO_TWIPS));
    const padV = Math.max(20, Math.round((rowGapMm / 2) * MM_TO_TWIPS));

    for (let i = 0; i < imagensPaths.length; i += fotosPorPagina) {
      const loteFotos = imagensPaths.slice(i, i + fotosPorPagina);
      children.push(new Paragraph({ children: [new PageBreak()] }));

      if (loteFotos.length === 1 && imgCfg.centerLastOddImage && fs.existsSync(loteFotos[0])) {
        const imgBuf = fs.readFileSync(loteFotos[0]);
        const trans = calcularTransformacaoProporcional(imgBuf, {
          targetWidthPx: mmParaPx(cardWidthEfetivaMm, 75),
          targetHeightPx: mmParaPx(cardHeightMm, 56)
        });
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: padV, after: padV },
            children: [new ImageRun({ data: imgBuf, transformation: trans })]
          })
        );
        continue;
      }

      const tableRows = [];
      for (let j = 0; j < loteFotos.length; j += cols) {
        const cells = [];
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const foto = loteFotos[j + cIdx];
          if (foto && fs.existsSync(foto)) {
            const imgBuffer = fs.readFileSync(foto);
            const trans = calcularTransformacaoProporcional(imgBuffer, {
              targetWidthPx: mmParaPx(cardWidthEfetivaMm, 75),
              targetHeightPx: mmParaPx(cardHeightMm, 56)
            });
            cells.push(
              new TableCell({
                width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: {
                  top: padV,
                  bottom: padV,
                  left: cIdx === 0 ? 0 : padH,
                  right: cIdx === cols - 1 ? 0 : padH
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new ImageRun({
                        data: imgBuffer,
                        transformation: trans
                      })
                    ]
                  })
                ]
              })
            );
          } else {
            cells.push(
              new TableCell({
                width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
                children: [new Paragraph({ text: '' })]
              })
            );
          }
        }
        tableRows.push(new TableRow({ children: cells }));
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: SEM_BORDAS,
          rows: tableRows
        })
      );
    }
  }

  const rodapeOficial = criarRodapeDocx(usarModoClonado, visual, footerLogoPath, textoAvisoLegal, fonte);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: A4_WIDTH_TWIPS,
            height: A4_HEIGHT_TWIPS
          },
          margin: {
            top: marginTopTwips,
            bottom: marginBottomTwips,
            left: marginLeftTwips,
            right: marginRightTwips,
            header: headerDistTwips,
            footer: mmParaTwips(8, 454)
          }
        }
      },
      headers: wordHeaderDefault ? { default: wordHeaderDefault } : undefined,
      footers: rodapeOficial ? { default: rodapeOficial } : undefined,
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(caminhoSaida, buffer);
  console.log('Documento DOCX atualizado com sucesso em: ' + caminhoSaida);
}

module.exports = {
  gerarDocxLaudo,
  lerDimensoesImagem,
  calcularTransformacaoProporcional
};
