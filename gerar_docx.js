const { normalizarRotuloResponsavel } = require('./extrator_padrao_laudo');
const fs = require('fs');
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
  Footer,
  UnderlineType
} = require('docx');
const { obterLayout, converterParaDocx } = require('./gerenciador_layout');

function criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome = 'Vetaro') {
  const fonte = (cfgDocx && cfgDocx.fontFamily) || 'Calibri';
  const szCabecalho = 20;

  const celulas = [];
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    celulas.push(
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: { width: 130, height: 52 }
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
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [new TableRow({ children: celulas })]
  });
}

function criarCabecalhoClonadoDocx(dados, headerBannerPath, visual, fonte) {
  const elementos = [];
  if (headerBannerPath && fs.existsSync(headerBannerPath)) {
    const bannerBuffer = fs.readFileSync(headerBannerPath);
    elementos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        children: [
          new ImageRun({
            data: bannerBuffer,
            transformation: { width: 520, height: 110 }
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

  const upper = pHeader.valueCase === 'UPPERCASE';
  const fmt = (val, def = '') => {
    const s = String(val !== undefined && val !== null && val !== '' ? val : def).trim();
    return upper ? s.toUpperCase() : s;
  };

  let sexoBruto = String(dados.sexo || '').trim();
  if (pHeader.sexoAbreviado) {
    if (/^f/i.test(sexoBruto)) sexoBruto = 'F';
    else if (/^m/i.test(sexoBruto)) sexoBruto = 'M';
  }

  const mapa = {
    data: fmt(dados.data, ''),
    nome: fmt(dados.nome || dados.paciente, ''),
    sexo: fmt(sexoBruto, ''),
    especie: fmt(dados.especie, upper ? 'CANINA' : 'Canina'),
    requisitante: fmt(dados.requisitante, ''),
    idade: fmt(dados.idade, upper ? 'NÃO INFORMADA' : 'Não informada'),
    tutor: fmt(dados.tutor || dados.proprietario, ''),
    raca: fmt(dados.raca, 'SRD')
  };

  const sz = 22; // 11pt

  if (pHeader.layoutType === 'boxed_table' && Array.isArray(pHeader.rows) && pHeader.rows.length > 0) {
    const docxRows = pHeader.rows.map((rowCells) => {
      const cells = rowCells.map((c) => {
        const w = c.widthPct || Math.floor(100 / Math.max(1, rowCells.length));
        return new TableCell({
          width: { size: w, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: `${c.label} `, bold: true, size: sz, font: fonte }),
                new TextRun({ text: mapa[c.key] ?? fmt(dados[c.key], ''), size: sz, font: fonte })
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
    const cols = pHeader.columns || [];
    const tableCells = cols.map((col) => {
      const pars = col.map((c) => new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${c.label} `, bold: true, size: sz, font: fonte }),
          new TextRun({ text: mapa[c.key] ?? fmt(dados[c.key], c.default || ''), size: sz, font: fonte })
        ]
      }));
      return new TableCell({
        width: { size: Math.floor(100 / Math.max(1, cols.length)), type: WidthType.PERCENTAGE },
        children: pars
      });
    });

    elementos.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE }
        },
        rows: [new TableRow({ children: tableCells })]
      })
    );
  }

  return elementos;
}

async function gerarDocxLaudo(dados, laudo, caminhoSaida, logoPath, imagensPaths = [], customLayout = null, opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = customLayout || await obterLayout(opcoes.usuarioId || usuario.id || null);
  const cfgDocx = converterParaDocx(layout);
  const fonte = cfgDocx.fontFamily || 'Calibri';
  const children = [];
  const szCorpo = cfgDocx.szCorpo || 22;

  const usarModoClonado = Boolean(layout?.modo_template === 'clonado_pdf' || layout?.visual_config_json);
  const visual = layout?.visual_config_json || {};
  const escrita = layout?.writing_style_json || {};
  const templateVisual = opcoes.templateVisual || opcoes.perfilLaudo?.templateVisual || {};

  const tituloDocx = templateVisual.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL';
  const subtituloDocx = templateVisual.subtituloDocumento !== undefined
    ? templateVisual.subtituloDocumento
    : 'Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo';
  const textoAvisoLegal = templateVisual.textoAvisoLegal || 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.';

  const sCfg = visual.signatureConfig || {};
  const nomeExtraido = sCfg.textLines?.[0]?.text || '';
  const crmvExtraido = sCfg.textLines?.[1]?.text || '';

  const nomeMedico = opcoes.nomeMedico || nomeExtraido || usuario.nome || 'Médico(a) Veterinário(a)';
  const crmvMedico = opcoes.crmvMedico || crmvExtraido || usuario.crmv || '';
  const clinicaNome = opcoes.clinicaNome || usuario.nomeClinica || 'Vetaro';
  const assinaturaPath = opcoes.assinaturaPath || layout?.assinatura_extraida_url || usuario.assinaturaUrl || null;

  if (usarModoClonado) {
    const headerBannerPath = layout?.header_banner_url || null;
    children.push(...criarCabecalhoClonadoDocx(dados, headerBannerPath, visual, fonte));
    children.push(new Paragraph({ text: '', spacing: { after: 120 } }));

    const tCfg = visual.titleConfig || {};
    if (tCfg.showTextTitle !== false && tCfg.text) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: tCfg.text,
              bold: true,
              underline: tCfg.underline ? { type: UnderlineType.SINGLE } : undefined,
              size: cfgDocx.szTitulo || 22,
              font: fonte,
              color: '000000'
            })
          ]
        })
      );
    }
  } else {
    children.push(criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: tituloDocx,
            bold: true,
            size: cfgDocx.szTitulo || 24,
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
              size: 15.5,
              font: fonte,
              color: cfgDocx.corSecundariaHex || '4A777A'
            })
          ]
        })
      );
    }
  }

  const usarDiagDif = usarModoClonado ? (escrita?.usarDiagDifSeparado !== false) : true;
  const alinhamentoCorpo = (usarModoClonado && visual?.bodyTypography?.textAlign === 'left')
    ? AlignmentType.LEFT
    : AlignmentType.JUSTIFIED;

  laudo.forEach(item => {
    const regexOrgao = new RegExp(`^${String(item.orgao || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s-]*`, 'i');
    let textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();
    textoLimpo = textoLimpo.replace(/(DIAG\s*DIF\.?\s*:\s*){2,}/gi, 'DIAG DIF.: ');
    if (!usarDiagDif) {
      textoLimpo = textoLimpo.replace(/\s*DIAG\s*DIF\.?\s*:[^\n]*$/gi, '').trim();
    }

    const linhas = textoLimpo.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const runs = [
      new TextRun({ text: item.orgao + ': ', bold: true, size: szCorpo, font: fonte })
    ];

    linhas.forEach((linha, idx) => {
      const ehObs = /^Obs\.?:/i.test(linha);
      if (idx === 0) {
        runs.push(new TextRun({ text: linha, size: szCorpo, font: fonte }));
      } else {
        runs.push(new TextRun({
          text: linha,
          break: 1,
          italics: ehObs,
          size: ehObs ? 17 : szCorpo,
          font: fonte
        }));
      }
    });

    if (usarDiagDif && item.diagDif && item.diagDif.trim() !== '') {
      const diagLimpo = item.diagDif.replace(/^(\s*DIAG\s*DIF\.?\s*:?\s*)+/i, '').trim();
      if (diagLimpo && !textoLimpo.toUpperCase().includes('DIAG DIF')) {
        runs.push(new TextRun({ text: ' DIAG DIF.: ', bold: true, italics: true, size: szCorpo, font: fonte }));
        runs.push(new TextRun({ text: diagLimpo, italics: true, size: szCorpo, font: fonte }));
      }
    }

    children.push(
      new Paragraph({
        alignment: alinhamentoCorpo,
        spacing: { after: cfgDocx.spacingAfter, line: cfgDocx.lineSpacing },
        children: runs
      })
    );
  });

  children.push(new Paragraph({ text: '', spacing: { after: 60 } }));

  const alinhamentoAssinatura = (usarModoClonado && sCfg.alignment === 'center')
    ? AlignmentType.CENTER
    : AlignmentType.RIGHT;

  const paragrafosTextoAssinatura = [
    new Paragraph({
      alignment: alinhamentoAssinatura,
      spacing: { after: 15 },
      children: [
        new TextRun({
          text: nomeMedico,
          bold: sCfg.textLines?.[0]?.bold !== false,
          italics: Boolean(sCfg.textLines?.[0]?.italic),
          size: 20,
          font: fonte
        })
      ]
    }),
    ...(crmvMedico ? [
      new Paragraph({
        alignment: alinhamentoAssinatura,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: crmvMedico,
            bold: Boolean(sCfg.textLines?.[1]?.bold),
            size: 18,
            font: fonte
          })
        ]
      })
    ] : [])
  ];

  const paragrafoImgAssinatura = (assinaturaPath && fs.existsSync(assinaturaPath))
    ? new Paragraph({
        alignment: alinhamentoAssinatura,
        spacing: { after: 25 },
        children: [
          new ImageRun({
            data: fs.readFileSync(assinaturaPath),
            transformation: { width: 150, height: 42 }
          })
        ]
      })
    : null;

  if (usarModoClonado && sCfg.order === 'text_above_image') {
    children.push(...paragrafosTextoAssinatura);
    if (paragrafoImgAssinatura) children.push(paragrafoImgAssinatura);
  } else {
    if (paragrafoImgAssinatura) children.push(paragrafoImgAssinatura);
    children.push(...paragrafosTextoAssinatura);
  }

  if (imagensPaths && imagensPaths.length > 0) {
    const imgCfg = visual?.imageGridConfig || {};
    const fotosPorPagina = (imgCfg.columns || 2) * (imgCfg.rowsPerPage || 3);

    for (let i = 0; i < imagensPaths.length; i += fotosPorPagina) {
      const loteFotos = imagensPaths.slice(i, i + fotosPorPagina);
      children.push(new Paragraph({ children: [new PageBreak()] }));

      const tableRows = [];
      for (let j = 0; j < loteFotos.length; j += 2) {
        const foto1 = loteFotos[j];
        const foto2 = loteFotos[j + 1];
        const cells = [];

        [foto1, foto2].forEach((foto) => {
          if (foto && fs.existsSync(foto)) {
            const imgBuffer = fs.readFileSync(foto);
            cells.push(
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
                    children: [
                      new ImageRun({
                        data: imgBuffer,
                        transformation: { width: 245, height: 172 }
                      })
                    ]
                  })
                ]
              })
            );
          } else {
            cells.push(new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph('')] }));
          }
        });

        tableRows.push(new TableRow({ children: cells }));
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE }
          },
          rows: tableRows
        })
      );
    }
  }

  const textoDisclaimerRodape = usarModoClonado && visual?.footerConfig?.disclaimerText
    ? visual.footerConfig.disclaimerText
    : 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.';

  const rodapeOficial = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            style: usarModoClonado ? BorderStyle.DASHED : BorderStyle.SINGLE,
            size: 6,
            color: 'B0B0B0',
            space: 4
          }
        },
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: textoAvisoLegal || textoDisclaimerRodape,
            italics: !usarModoClonado,
            size: 15,
            color: '555555',
            font: fonte || 'Arial'
          })
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: cfgDocx.marginTop,
            bottom: cfgDocx.marginBottom,
            left: cfgDocx.marginLeft,
            right: cfgDocx.marginRight
          }
        }
      },
      footers: {
        default: rodapeOficial
      },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(caminhoSaida, buffer);
  console.log('Documento DOCX atualizado com sucesso em: ' + caminhoSaida);
}

module.exports = { gerarDocxLaudo };
