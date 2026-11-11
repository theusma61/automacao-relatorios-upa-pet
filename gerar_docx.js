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
  Footer
} = require('docx');

function criarCabecalhoDocx(dados, logoPath) {
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
    logoRun = new TextRun({ text: "UPA PET", bold: true, size: 32, font: "Arial" });
  }

  const szCabecalho = 20; // 10pt (aumentado para maior legibilidade)

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
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
              new Paragraph({ children: [new TextRun({ text: "Nome: ", bold: true, size: szCabecalho, font: "Arial" }), new TextRun({ text: dados.nome || "", size: szCabecalho, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "Espécie: ", bold: true, size: szCabecalho, font: "Arial" }), new TextRun({ text: dados.especie || "", size: szCabecalho, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "Idade: ", bold: true, size: szCabecalho, font: "Arial" }), new TextRun({ text: dados.idade || "Não informada", size: szCabecalho, font: "Arial" })] }),
            ]
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: "Tutor: ", bold: true, size: szCabecalho, font: "Arial" }), new TextRun({ text: dados.tutor || "", size: szCabecalho, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "Sexo: ", bold: true, size: szCabecalho, font: "Arial" }), new TextRun({ text: dados.sexo || "", size: szCabecalho, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "Data: ", bold: true, size: szCabecalho, font: "Arial" }), new TextRun({ text: dados.data || "", size: szCabecalho, font: "Arial" })] }),
            ]
          })
        ]
      })
    ]
  });
}

async function gerarDocxLaudo(dados, laudo, caminhoSaida, logoPath, imagensPaths = []) {
  const children = [];
  const szCorpo = 20; // 10pt (aumentado para maior nitidez e conforto visual)

  // ==========================================
  // PÁGINA 1: CABEÇALHO + LAUDO + ASSINATURA
  // ==========================================
  children.push(criarCabecalhoDocx(dados, logoPath));

  // Espaçamento antes de RELATÓRIO
  children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

  // Título e Subtítulo
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL", bold: true, size: 22, font: "Arial" })
      ]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo",
          italics: true,
          size: 15.5,
          font: "Arial"
        })
      ]
    })
  );

  // Órgãos com espaçamento (respiro) entre cada um
  laudo.forEach(item => {
    // Remove repetição do nome do órgão caso venha duplicado no início do texto
    const regexOrgao = new RegExp(`^${item.orgao}[:\\s-]*`, 'i');
    const textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();

    // Divide em linhas caso haja quebras de linha (como em GLÂNDULA ADRENAL para AE: e AD:)
    const linhas = textoLimpo.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    const runs = [
      new TextRun({ text: item.orgao + ": ", bold: true, size: szCorpo, font: "Arial" })
    ];

    linhas.forEach((linha, idx) => {
      if (idx === 0) {
        runs.push(new TextRun({ text: linha, size: szCorpo, font: "Arial" }));
      } else {
        // Quebra de linha no mesmo bloco, alinhada à esquerda
        runs.push(new TextRun({ text: linha, break: 1, size: szCorpo, font: "Arial" }));
      }
    });

    if (item.diagDif && item.diagDif.trim() !== "") {
      runs.push(new TextRun({ text: " DIAG DIF.: ", bold: true, italics: true, size: szCorpo, font: "Arial" }));
      runs.push(new TextRun({ text: item.diagDif, italics: true, size: szCorpo, font: "Arial" }));
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 150 },
        children: runs
      })
    );
  });

  // Assinatura alinhada à direita em duas linhas perfeitamente separadas
  children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 15 },
      children: [
        new TextRun({ text: "Camila Bastos", bold: true, size: 19, font: "Arial" })
      ]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: "CRMV/MG: 22904", size: 17, font: "Arial" })
      ]
    })
  );

  // ==========================================
  // PÁGINAS SEGUINTES: MOSAICO DE IMAGENS
  // ==========================================
  if (imagensPaths && imagensPaths.length > 0) {
    const fotosPorPagina = 8;
    for (let i = 0; i < imagensPaths.length; i += fotosPorPagina) {
      const loteFotos = imagensPaths.slice(i, i + fotosPorPagina);

      // Quebra de página
      children.push(new Paragraph({ children: [new PageBreak()] }));

      // Cabeçalho repetido no topo da página de fotos
      children.push(criarCabecalhoDocx(dados, logoPath));
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

      // Monta tabela de fotos (2 colunas)
      const tableRows = [];
      for (let j = 0; j < loteFotos.length; j += 2) {
        const foto1 = loteFotos[j];
        const foto2 = loteFotos[j + 1];

        const cells = [];

        // Coluna 1
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
          cells.push(new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph("")] }));
        }

        // Coluna 2
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
          cells.push(new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph("")] }));
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
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: tableRows
        })
      );
    }
  }

  // ==========================================
  // RODAPÉ OFICIAL FIXO EM TODAS AS PÁGINAS
  // Com linha superior cinza (exatamente igual ao PDF)
  // ==========================================
  const rodapeOficial = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 6, // linha fina de 0.75pt
            color: "B0B0B0",
            space: 4
          }
        },
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: "O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.",
            italics: true,
            size: 15, // 7.5pt
            color: "555555",
            font: "Arial"
          })
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 520, bottom: 580, left: 880, right: 880 }
        }
      },
      footers: {
        default: rodapeOficial // FIXO EM TODAS AS PÁGINAS DO DOCUMENTO
      },
      children: children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(caminhoSaida, buffer);
  console.log("Documento DOCX atualizado com sucesso em: " + caminhoSaida);
}

module.exports = { gerarDocxLaudo };
