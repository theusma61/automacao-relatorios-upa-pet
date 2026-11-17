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
  Footer
} = require('docx');
const { obterLayout, converterParaDocx } = require('./gerenciador_layout');

function criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome = 'UPA PET') {
  const fonte = (cfgDocx && cfgDocx.fontFamily) || 'Arial';
  let logoRun;
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoRun = new ImageRun({
      data: logoBuffer,
      transformation: {
        width: 130,
        height: 52
      }
    });
  } else {
    logoRun = new TextRun({
      text: clinicaNome || 'UPA PET',
      bold: true,
      size: 32,
      font: fonte,
      color: (cfgDocx && cfgDocx.corPrimariaHex) || undefined
    });
  }

  const szCabecalho = 20;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [logoRun]
              })
            ]
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Nome: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.nome || '', size: szCabecalho, font: fonte })] }),
              new Paragraph({ children: [new TextRun({ text: 'Espécie: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.especie || '', size: szCabecalho, font: fonte })] }),
              new Paragraph({ children: [new TextRun({ text: 'Idade: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.idade || 'Não informada', size: szCabecalho, font: fonte })] })
            ]
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Tutor: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.tutor || '', size: szCabecalho, font: fonte })] }),
              new Paragraph({ children: [new TextRun({ text: 'Sexo: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.sexo || '', size: szCabecalho, font: fonte })] }),
              new Paragraph({ children: [new TextRun({ text: 'Data: ', bold: true, size: szCabecalho, font: fonte }), new TextRun({ text: dados.data || '', size: szCabecalho, font: fonte })] })
            ]
          })
        ]
      })
    ]
  });
}

async function gerarDocxLaudo(dados, laudo, caminhoSaida, logoPath, imagensPaths = [], customLayout = null, opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = customLayout || await obterLayout(opcoes.usuarioId || usuario.id || null);
  const cfgDocx = converterParaDocx(layout);
  const fonte = cfgDocx.fontFamily || 'Calibri';
  const children = [];
  const szCorpo = cfgDocx.szCorpo || 20;

  const templateVisual = opcoes.templateVisual || opcoes.perfilLaudo?.templateVisual || {};
  const tituloDocx = templateVisual.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL';
  const subtituloDocx = templateVisual.subtituloDocumento !== undefined
    ? templateVisual.subtituloDocumento
    : 'Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo';
  const textoAvisoLegal = templateVisual.textoAvisoLegal || 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.';

  const nomeMedico = opcoes.nomeMedico || usuario.nome || 'Camila Bastos';
  const crmvMedico = opcoes.crmvMedico || usuario.crmv || 'CRMV/MG: 22904';
  const clinicaNome = opcoes.clinicaNome || usuario.nomeClinica || 'UPA PET';
  const assinaturaPath = opcoes.assinaturaPath || usuario.assinaturaUrl || null;

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

  laudo.forEach(item => {
    const regexOrgao = new RegExp(`^${item.orgao}[:\\s-]*`, 'i');
    const textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();
    const linhas = textoLimpo.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    const runs = [
      new TextRun({ text: item.orgao + ': ', bold: true, size: szCorpo, font: fonte })
    ];

    linhas.forEach((linha, idx) => {
      if (idx === 0) {
        runs.push(new TextRun({ text: linha, size: szCorpo, font: fonte }));
      } else {
        runs.push(new TextRun({ text: linha, break: 1, size: szCorpo, font: fonte }));
      }
    });

    if (item.diagDif && item.diagDif.trim() !== '') {
      runs.push(new TextRun({ text: ' DIAG DIF.: ', bold: true, italics: true, size: szCorpo, font: fonte }));
      runs.push(new TextRun({ text: item.diagDif, italics: true, size: szCorpo, font: fonte }));
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: cfgDocx.spacingAfter, line: cfgDocx.lineSpacing },
        children: runs
      })
    );
  });

  children.push(new Paragraph({ text: '', spacing: { after: 60 } }));
  if (assinaturaPath && fs.existsSync(assinaturaPath)) {
    const assBuffer = fs.readFileSync(assinaturaPath);
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 20 },
        children: [
          new ImageRun({
            data: assBuffer,
            transformation: { width: 95, height: 48 }
          })
        ]
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 15 },
      children: [
        new TextRun({ text: nomeMedico, bold: true, size: 19, font: fonte })
      ]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: crmvMedico, size: 17, font: fonte })
      ]
    })
  );

  if (imagensPaths && imagensPaths.length > 0) {
    const fotosPorPagina = 8;
    for (let i = 0; i < imagensPaths.length; i += fotosPorPagina) {
      const loteFotos = imagensPaths.slice(i, i + fotosPorPagina);

      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome));
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));

      const tableRows = [];
      for (let j = 0; j < loteFotos.length; j += 2) {
        const foto1 = loteFotos[j];
        const foto2 = loteFotos[j + 1];
        const cells = [];

        if (foto1 && fs.existsSync(foto1)) {
          const imgBuffer = fs.readFileSync(foto1);
          cells.push(
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 50 },
                  children: [
                    new ImageRun({
                      data: imgBuffer,
                      transformation: { width: 255, height: 180 }
                    })
                  ]
                })
              ]
            })
          );
        } else {
          cells.push(new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph('')] }));
        }

        if (foto2 && fs.existsSync(foto2)) {
          const imgBuffer = fs.readFileSync(foto2);
          cells.push(
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 50 },
                  children: [
                    new ImageRun({
                      data: imgBuffer,
                      transformation: { width: 255, height: 180 }
                    })
                  ]
                })
              ]
            })
          );
        } else {
          cells.push(new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph('')] }));
        }

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

  const rodapeOficial = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: 'B0B0B0',
            space: 4
          }
        },
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: textoAvisoLegal,
            italics: true,
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
