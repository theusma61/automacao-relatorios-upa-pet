const fs = require('fs');
const path = require('path');
const os = require('os');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, BorderStyle, PageBreak } = require('docx');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, 'assets');
const LOGO_PATH = fs.existsSync(path.join(ASSETS_DIR, 'logo_upa_pet_oficial.png'))
  ? path.join(ASSETS_DIR, 'logo_upa_pet_oficial.png')
  : path.join(ASSETS_DIR, 'logo_upa_pet.jpg');
const ASSINATURA_PATH = fs.existsSync(path.join(ASSETS_DIR, 'assinatura_camila.jpg'))
  ? path.join(ASSETS_DIR, 'assinatura_camila.jpg')
  : null;

/**
 * Lê as dimensões reais (largura x altura) de um buffer de imagem PNG ou JPEG
 */
function obterDimensoesImagem(buffer) {
  try {
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] === 0xFF) {
          const marker = buffer[offset + 1];
          if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
          }
          if (marker === 0xD9 || marker === 0xDA) break;
          const len = buffer.readUInt16BE(offset + 2);
          offset += 2 + len;
        } else {
          offset++;
        }
      }
    }
  } catch (e) {}
  return { width: 800, height: 600 };
}

/**
 * Redimensiona proporcionalmente mantendo os limites máximos para caber na página do Word
 */
function calcularDimensoesDocx(origWidth, origHeight, maxWidth = 480, maxHeight = 480) {
  let w = origWidth || 800;
  let h = origHeight || 600;
  if (w > maxWidth) {
    h = Math.round(h * (maxWidth / w));
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = Math.round(w * (maxHeight / h));
    h = maxHeight;
  }
  return { width: w, height: h };
}

/**
 * Gera o documento DOCX com exata tipografia (Calibri 11pt corpo, 14pt título, bordas limpas)
 */
async function gerarDocxCirurgico(dadosPaciente, dadosCirurgia, caminhoSaidaDocx, imagens = []) {
  const logoBytes = fs.readFileSync(LOGO_PATH);
  const assinaturaBytes = ASSINATURA_PATH ? fs.readFileSync(ASSINATURA_PATH) : null;

  const textoTotal = (dadosCirurgia.descricaoProcedimento || '') + (dadosCirurgia.evolucaoConsideracoes || '');
  const ehTextoLongo = textoTotal.length > 1750;
  const ehTextoMuitoLongo = textoTotal.length > 2300;

  const szCorpo = ehTextoMuitoLongo ? 19 : (ehTextoLongo ? 20 : 22);
  const szTitulo = 28;
  const lineSpacingDocx = ehTextoMuitoLongo ? 220 : (ehTextoLongo ? 240 : 260);
  const spacingAfterDocx = ehTextoMuitoLongo ? 80 : (ehTextoLongo ? 100 : 140);

  const bordaTransparente = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  // Tabela de Cabeçalho: Logo à esquerda, dados do paciente à direita em 2 colunas
  const tabelaCabecalho = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: bordaTransparente,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: bordaTransparente,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new ImageRun({
                    data: logoBytes,
                    transformation: { width: 130, height: 65 }
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: bordaTransparente,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Nome: ", font: "Calibri", size: szCorpo }),
                  new TextRun({ text: dadosPaciente.nome || "Não informado", font: "Calibri", size: szCorpo })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Sexo: ", font: "Calibri", size: szCorpo }),
                  new TextRun({ text: dadosPaciente.sexo || "Não informado", font: "Calibri", size: szCorpo })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Idade: ", font: "Calibri", size: szCorpo }),
                  new TextRun({ text: dadosPaciente.idade || "Não informado", font: "Calibri", size: szCorpo })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: bordaTransparente,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Tutor: ", font: "Calibri", size: szCorpo }),
                  new TextRun({ text: dadosPaciente.tutor || "Não informado", font: "Calibri", size: szCorpo })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Espécie: ", font: "Calibri", size: szCorpo }),
                  new TextRun({ text: dadosPaciente.especie || "Não informada", font: "Calibri", size: szCorpo })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Peso: ", font: "Calibri", size: szCorpo }),
                  new TextRun({ text: dadosPaciente.peso || "Não informado", font: "Calibri", size: szCorpo })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // Parágrafos do corpo cirúrgico
  const paragrafos = [
    tabelaCabecalho,
    new Paragraph({ spacing: { before: ehTextoLongo ? 100 : 180, after: ehTextoLongo ? 80 : 120 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: ehTextoLongo ? 80 : 120, after: ehTextoLongo ? 140 : 200 },
      children: [
        new TextRun({
          text: "RELATÓRIO CIRÚRGICO",
          bold: true,
          font: "Calibri",
          size: szTitulo
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
      children: [
        new TextRun({ text: "DATA DO PROCEDIMENTO CIRURGICO: ", bold: true, font: "Calibri", size: szCorpo }),
        new TextRun({ text: dadosCirurgia.data || dadosPaciente.data || "Não informada", font: "Calibri", size: szCorpo })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
      children: [
        new TextRun({ text: "PROCEDIMENTO: ", bold: true, font: "Calibri", size: szCorpo }),
        new TextRun({ text: dadosCirurgia.procedimento || "Não informado", font: "Calibri", size: szCorpo })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
      children: [
        new TextRun({ text: "DIAGNÓSTICO PRÉ-CIRURGICO: ", bold: true, font: "Calibri", size: szCorpo }),
        new TextRun({ text: dadosCirurgia.diagnosticoPreCirurgico || "Não informado", font: "Calibri", size: szCorpo })
      ]
    })
  ];

  // Descrição do procedimento (pode conter múltiplos parágrafos separados por \n\n)
  const descParagrafos = (dadosCirurgia.descricaoProcedimento || "").split(/\n\s*\n/);
  descParagrafos.forEach((par, idx) => {
    if (idx === 0) {
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.BOTH,
          spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
          children: [
            new TextRun({ text: "DESCRIÇÃO DO PROCEDIMENTO CIRURGICO: ", bold: true, font: "Calibri", size: szCorpo }),
            new TextRun({ text: par.trim(), font: "Calibri", size: szCorpo })
          ]
        })
      );
    } else {
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.BOTH,
          spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
          children: [
            new TextRun({ text: par.trim(), font: "Calibri", size: szCorpo })
          ]
        })
      );
    }
  });

  // Evolução e considerações
  paragrafos.push(
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: ehTextoLongo ? 120 : 180, line: lineSpacingDocx },
      children: [
        new TextRun({ text: "EVOLUÇÃO E CONSIDERAÇÕES: ", bold: true, font: "Calibri", size: szCorpo }),
        new TextRun({ text: dadosCirurgia.evolucaoConsideracoes || "Procedimento transcorrido sem intercorrências.", font: "Calibri", size: szCorpo })
      ]
    })
  );

  // Assinatura
  const blocoAssinatura = [];
  if (assinaturaBytes) {
    blocoAssinatura.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: ehTextoLongo ? 100 : 160, after: 30 },
        children: [
          new ImageRun({
            data: assinaturaBytes,
            transformation: { width: 100, height: 68 }
          })
        ]
      })
    );
  }
  blocoAssinatura.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "Camila Bastos", font: "Calibri", size: szCorpo })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "CRMV/MG: 22904", font: "Calibri", size: szCorpo })
      ]
    })
  );

  paragrafos.push(...blocoAssinatura);

  // Inclusão de imagens anexas na Página 2 (se houver imagens enviadas)
  const imagensValidas = (imagens || []).filter(img => fs.existsSync(img));
  if (imagensValidas.length > 0) {
    // Quebra de página para a Página 2
    paragrafos.push(
      new Paragraph({
        children: [new PageBreak()]
      })
    );

    // Cabeçalho da página 2
    paragrafos.push(tabelaCabecalho);
    paragrafos.push(new Paragraph({ spacing: { before: 80, after: 100 } }));

    // Título da seção de fotos
    paragrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 160 },
        children: [
          new TextRun({
            text: "REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO",
            bold: true,
            font: "Calibri",
            size: szTitulo
          })
        ]
      })
    );

    for (let i = 0; i < imagensValidas.length; i++) {
      const imgPath = imagensValidas[i];
      const imgBuffer = fs.readFileSync(imgPath);
      const dims = obterDimensoesImagem(imgBuffer);

      const maxW = imagensValidas.length === 1 ? 480 : 380;
      const maxH = imagensValidas.length === 1 ? 460 : 230;
      const { width, height } = calcularDimensoesDocx(dims.width, dims.height, maxW, maxH);

      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            new ImageRun({
              data: imgBuffer,
              transformation: { width, height }
            })
          ]
        })
      );

      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: `Figura ${i + 1} - Registro fotográfico intraoperatório / peça cirúrgica`,
              italics: true,
              font: "Calibri",
              size: szCorpo - 2
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2.0 cm
              bottom: 1134,
              left: 1417, // ~2.5 cm
              right: 1417
            }
          }
        },
        children: paragrafos
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(caminhoSaidaDocx, buffer);
  return caminhoSaidaDocx;
}

/**
 * Gera o documento PDF com exata tipografia (Calibri 11pt corpo, 14pt título, margens calibradas)
 */
async function gerarPdfCirurgico(dadosPaciente, dadosCirurgia, caminhoSaidaPdf, imagens = []) {
  const logoBase64 = fs.readFileSync(LOGO_PATH).toString('base64');
  const logoExt = path.extname(LOGO_PATH).toLowerCase() === '.png' ? 'png' : 'jpeg';
  const logoSrc = `data:image/${logoExt};base64,${logoBase64}`;

  const textoTotal = (dadosCirurgia.descricaoProcedimento || '') + (dadosCirurgia.evolucaoConsideracoes || '');
  const ehTextoLongo = textoTotal.length > 1750;
  const ehTextoMuitoLongo = textoTotal.length > 2300;

  const fontSizePt = ehTextoMuitoLongo ? '9.3pt' : (ehTextoLongo ? '10.2pt' : '11pt');
  const lineHeight = ehTextoMuitoLongo ? '1.24' : (ehTextoLongo ? '1.28' : '1.35');
  const marginBottomP = ehTextoMuitoLongo ? '6px' : (ehTextoLongo ? '8px' : '11px');
  const margemVertical = ehTextoMuitoLongo ? '1.2cm' : (ehTextoLongo ? '1.5cm' : '1.8cm');
  const margemHorizontal = ehTextoMuitoLongo ? '1.8cm' : '2.0cm';
  const logoWidth = ehTextoMuitoLongo ? '110px' : (ehTextoLongo ? '120px' : '130px');
  const marginHeader = ehTextoMuitoLongo ? '12px' : '18px';
  const marginTitulo = ehTextoMuitoLongo ? '10px 0 12px 0' : (ehTextoLongo ? '14px 0 16px 0' : '18px 0 20px 0');
  const marginAssinatura = ehTextoMuitoLongo ? '14px' : '22px';
  const assinaturaMaxHeight = ehTextoMuitoLongo ? '50px' : '65px';

  let assinaturaHtml = '';
  if (ASSINATURA_PATH && fs.existsSync(ASSINATURA_PATH)) {
    const assBase64 = fs.readFileSync(ASSINATURA_PATH).toString('base64');
    assinaturaHtml = `<img src="data:image/jpeg;base64,${assBase64}" class="assinatura-img" alt="Assinatura" />`;
  }

  const descParagrafos = (dadosCirurgia.descricaoProcedimento || "")
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  let descHtml = '';
  descParagrafos.forEach((par, idx) => {
    if (idx === 0) {
      descHtml += `<p><strong>DESCRIÇÃO DO PROCEDIMENTO CIRURGICO:</strong> ${par}</p>`;
    } else {
      descHtml += `<p>${par}</p>`;
    }
  });

  // Anexo fotográfico para a Página 2 (se houver fotos enviadas)
  let anexoImagensHtml = '';
  const imagensValidasPdf = (imagens || []).filter(img => fs.existsSync(img));
  if (imagensValidasPdf.length > 0) {
    const cardsHtml = imagensValidasPdf.map((imgCaminho, idx) => {
      const imgExt = path.extname(imgCaminho).toLowerCase().replace('.', '');
      const mime = imgExt === 'png' ? 'image/png' : (imgExt === 'webp' ? 'image/webp' : 'image/jpeg');
      const imgBase64 = fs.readFileSync(imgCaminho).toString('base64');
      const imgSrc = `data:${mime};base64,${imgBase64}`;
      const ehUnica = imagensValidasPdf.length === 1;

      return `
        <div class="anexo-card ${ehUnica ? 'unica' : ''}">
          <div class="anexo-img-wrapper">
            <img src="${imgSrc}" class="anexo-foto ${ehUnica ? 'foto-grande' : ''}" alt="Registro Intraoperatório ${idx + 1}">
          </div>
          <div class="anexo-legenda">Figura ${idx + 1} - Registro fotográfico intraoperatório / peça cirúrgica</div>
        </div>
      `;
    }).join('\n');

    anexoImagensHtml = `
      <div class="pagina-anexo">
        <table class="header-table header-anexo">
          <tr>
            <td class="logo-cell">
              <img src="${logoSrc}" class="logo-img" alt="UPA PET">
            </td>
            <td class="col-info">
              <div><strong>Paciente:</strong> ${dadosPaciente.nome || 'Não informado'}</div>
              <div><strong>Espécie:</strong> ${dadosPaciente.especie || 'Não informada'} | <strong>Sexo:</strong> ${dadosPaciente.sexo || 'Não informado'}</div>
            </td>
            <td class="col-info">
              <div><strong>Tutor:</strong> ${dadosPaciente.tutor || 'Não informado'}</div>
              <div><strong>Data:</strong> ${dadosCirurgia.data || dadosPaciente.data || 'Não informada'}</div>
            </td>
          </tr>
        </table>

        <div class="titulo-anexo">REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO</div>

        <div class="anexo-grade ${imagensValidasPdf.length === 1 ? 'grade-unica' : (imagensValidasPdf.length === 2 ? 'grade-dupla' : 'grade-multipla')}">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Cirúrgico - ${dadosPaciente.nome || 'Paciente'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${margemVertical} ${margemHorizontal};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: ${fontSizePt};
      line-height: ${lineHeight};
      color: #000;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${marginHeader};
    }
    .header-table td {
      vertical-align: middle;
      padding: 2px 4px;
      font-size: ${fontSizePt};
      border: none;
    }
    .logo-cell {
      width: 32%;
      text-align: left;
    }
    .logo-img {
      width: ${logoWidth};
      height: auto;
      display: block;
    }
    .col-info {
      width: 34%;
      line-height: 1.38;
    }
    .titulo-relatorio {
      text-align: center;
      font-size: 13.5pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: ${marginTitulo};
      text-transform: uppercase;
    }
    .conteudo-cirurgico p {
      text-align: justify;
      text-justify: inter-word;
      margin-bottom: ${marginBottomP};
      line-height: ${lineHeight};
    }
    .conteudo-cirurgico strong {
      font-weight: bold;
    }
    .assinatura-bloco {
      text-align: center;
      margin-top: ${marginAssinatura};
      page-break-inside: avoid;
    }
    .assinatura-img {
      max-height: ${assinaturaMaxHeight};
      display: block;
      margin: 0 auto 3px auto;
    }
    .assinatura-nome {
      font-size: ${fontSizePt};
      line-height: 1.25;
    }
    .assinatura-crmv {
      font-size: ${fontSizePt};
      line-height: 1.25;
    }

    /* Estilos do Anexo Fotográfico (Página 2) */
    .pagina-anexo {
      page-break-before: always;
      break-before: page;
      padding-top: 5px;
    }
    .header-anexo {
      margin-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
    }
    .titulo-anexo {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: 10px 0 14px 0;
      text-transform: uppercase;
      color: #1a1a1a;
    }
    .anexo-grade {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }
    .grade-dupla {
      display: flex;
      flex-direction: row;
      justify-content: center;
      gap: 15px;
    }
    .anexo-card {
      text-align: center;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .anexo-card.unica {
      max-width: 95%;
      margin: 0 auto;
    }
    .anexo-img-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      border-radius: 4px;
    }
    .anexo-foto {
      max-width: 100%;
      max-height: 11cm;
      object-fit: contain;
      display: block;
    }
    .anexo-foto.foto-grande {
      max-height: 17.5cm;
      max-width: 100%;
    }
    .anexo-legenda {
      margin-top: 8px;
      font-size: 9.5pt;
      color: #555;
      font-style: italic;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="logo-cell">
        <img src="${logoSrc}" class="logo-img" alt="UPA PET">
      </td>
      <td class="col-info">
        <div>Nome: ${dadosPaciente.nome || 'Não informado'}</div>
        <div>Sexo: ${dadosPaciente.sexo || 'Não informado'}</div>
        <div>Idade: ${dadosPaciente.idade || 'Não informado'}</div>
      </td>
      <td class="col-info">
        <div>Tutor: ${dadosPaciente.tutor || 'Não informado'}</div>
        <div>Espécie: ${dadosPaciente.especie || 'Não informada'}</div>
        <div>Peso: ${dadosPaciente.peso || 'Não informado'}</div>
      </td>
    </tr>
  </table>

  <div class="titulo-relatorio">RELATÓRIO CIRÚRGICO</div>

  <div class="conteudo-cirurgico">
    <p><strong>DATA DO PROCEDIMENTO CIRURGICO:</strong> ${dadosCirurgia.data || dadosPaciente.data || 'Não informada'}</p>
    <p><strong>PROCEDIMENTO:</strong> ${dadosCirurgia.procedimento || 'Não informado'}</p>
    <p><strong>DIAGNÓSTICO PRÉ-CIRURGICO:</strong> ${dadosCirurgia.diagnosticoPreCirurgico || 'Não informado'}</p>
    
    ${descHtml}

    <p><strong>EVOLUÇÃO E CONSIDERAÇÕES:</strong> ${dadosCirurgia.evolucaoConsideracoes || 'Procedimento transcorrido sem intercorrências.'}</p>
  </div>

  <div class="assinatura-bloco">
    ${assinaturaHtml}
    <div class="assinatura-nome">Camila Bastos</div>
    <div class="assinatura-crmv">CRMV/MG: 22904</div>
  </div>

  ${anexoImagensHtml}
</body>
</html>`;

  const htmlTempPath = path.join(os.tmpdir(), `relatorio_cirurgico_temp_${Date.now()}_${Math.random().toString(36).substring(7)}.html`);
  fs.writeFileSync(htmlTempPath, html, 'utf8');

  try {
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    const msedge = edgePaths.find(p => p && fs.existsSync(p));

    if (!msedge) {
      throw new Error("Microsoft Edge não encontrado para compilação do PDF.");
    }

    const fileUrl = 'file:///' + htmlTempPath.replace(/\\/g, '/');
    const cmd = `"${msedge}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${caminhoSaidaPdf}" "${fileUrl}"`;
    execSync(cmd, { stdio: 'pipe' });

    return caminhoSaidaPdf;
  } finally {
    if (fs.existsSync(htmlTempPath)) {
      try { fs.unlinkSync(htmlTempPath); } catch (e) {}
    }
  }
}

/**
 * Função principal que gera tanto o Word (.docx) quanto o PDF (.pdf)
 */
async function gerarDocumentosCirurgicos(dadosPaciente, dadosCirurgia, pastaDestino, imagens = []) {
  const nomeLimpo = (dadosPaciente.nome || 'PACIENTE')
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_");

  const caminhoDocx = path.join(pastaDestino, `Relatorio_Cirurgico_${nomeLimpo}.docx`);
  const caminhoPdf = path.join(pastaDestino, `Relatorio_Cirurgico_${nomeLimpo}.pdf`);

  await gerarDocxCirurgico(dadosPaciente, dadosCirurgia, caminhoDocx, imagens);
  await gerarPdfCirurgico(dadosPaciente, dadosCirurgia, caminhoPdf, imagens);

  return { caminhoDocx, caminhoPdf };
}

module.exports = {
  gerarDocxCirurgico,
  gerarPdfCirurgico,
  gerarDocumentosCirurgicos
};
