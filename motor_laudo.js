const fs = require('fs');
const path = require('path');
const os = require('os');
const { gerarDocxLaudo } = require('./gerar_docx');
const { compilarPDF } = require('./compilador_pdf');

const assetsDir = path.join(__dirname, 'assets');
const logoPath = fs.existsSync(path.join(assetsDir, 'logo_upa_pet_oficial.png'))
  ? path.join(assetsDir, 'logo_upa_pet_oficial.png')
  : path.join(assetsDir, 'logo_upa_pet.jpg');

function gerarDocumentosExame(dadosPaciente, laudoArray, imagensPaths, pastaSaida) {
  const nomeSanitizado = (dadosPaciente.nome || 'Paciente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString('base64') : '';
  const logoMime = path.extname(logoPath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

  // 1. Gera o HTML com o CSS idêntico aprovado
  const paginasImagens = [];
  for (let i = 0; i < imagensPaths.length; i += 8) {
    paginasImagens.push(imagensPaths.slice(i, i + 8));
  }

  const cabecalho = `
    <div class="header">
      <div class="logo-box">
        <img src="data:${logoMime};base64,${logoBase64}" class="logo-img" alt="UPA PET">
      </div>
      <div class="patient-info">
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

  const laudoTextoHTML = laudoArray.map(item => {
    // Remove repetição do nome do órgão caso venha duplicado no início do texto
    const regexOrgao = new RegExp(`^${item.orgao}[:\\s-]*`, 'i');
    let textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();

    // Mantém quebras de linha para órgãos com subdivisões (como GLÂNDULA ADRENAL para AE: e AD:)
    const textoFormatado = textoLimpo.replace(/\r?\n/g, '<br>');

    let p = `<p><strong>${item.orgao}:</strong> ${textoFormatado}`;
    if (item.diagDif && item.diagDif.trim() !== '') {
      p += ` <em>DIAG DIF.: ${item.diagDif}</em>`;
    }
    p += `</p>`;
    return p;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Ultrassonografia - ${dadosPaciente.nome}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.8pt;
      line-height: 1.25;
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
      padding: 10mm 15mm 8mm 15mm;
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
        padding: 10mm 15mm 8mm 15mm !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    .header { display: flex; align-items: center; margin-bottom: 2px; }
    .logo-box { width: 140px; display: flex; align-items: center; }
    .logo-img { max-width: 130px; max-height: 52px; object-fit: contain; }
    .patient-info { flex: 1; display: flex; justify-content: space-around; margin-left: 15px; font-size: 10pt; }
    .patient-info .col p { margin: 1.5px 0; }
    .title-box { text-align: center; margin-top: 8px; margin-bottom: 8px; }
    .title-box h1 { font-size: 11pt; font-weight: bold; margin: 0; letter-spacing: 0.3px; }
    .title-box p { font-size: 8pt; font-style: italic; margin: 2px 0 0 0; color: #333; }
    .content { flex: 1; text-align: justify; font-size: 9.8pt; line-height: 1.25; outline: none; }
    .content p { margin: 0 0 4px 0; }
    .signature { text-align: right; margin-top: 4px; padding-right: 15px; }
    .signature p { margin: 1px 0; font-size: 9.5pt; }
    .footer { font-size: 7.2pt; font-style: italic; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 3px; margin-top: 4px; }
    .image-grid { display: grid; grid-template-columns: 1fr 1fr; grid-gap: 6px; flex: 1; margin-top: 6px; align-content: start; }
    .img-card { border: 1px solid #222; background: #000; display: flex; align-items: center; justify-content: center; height: 52mm; overflow: hidden; }
    .img-card img { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <!-- PÁGINA 1 -->
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
        <p><strong>Camila Bastos</strong></p>
        <p>CRMV/MG: 22904</p>
      </div>
      ${rodape}
    </div>
  </div>

  <!-- PÁGINAS DE IMAGENS -->
  ${paginasImagens.map((fotos, idx) => `
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

  // Compila o PDF usando um arquivo temporário para não poluir a pasta do exame com arquivo .html
  const caminhoHtmlTemp = path.join(os.tmpdir(), `laudo_temp_${Date.now()}_${nomeSanitizado}.html`);
  const caminhoPdf = path.join(pastaSaida, `Laudo_${nomeSanitizado}.pdf`);
  const caminhoDocx = path.join(pastaSaida, `Laudo_${nomeSanitizado}.docx`);

  fs.writeFileSync(caminhoHtmlTemp, html, 'utf8');

  // Compila o PDF oficial com o Edge
  compilarPDF(caminhoHtmlTemp, caminhoPdf);

  // Remove o arquivo temporário HTML
  try {
    fs.unlinkSync(caminhoHtmlTemp);
  } catch (e) {}

  // Remove qualquer arquivo HTML legado que porventura exista na pasta do paciente
  const caminhoHtmlAntigo = path.join(pastaSaida, `Laudo_${nomeSanitizado}.html`);
  if (fs.existsSync(caminhoHtmlAntigo)) {
    try {
      fs.unlinkSync(caminhoHtmlAntigo);
    } catch (e) {}
  }

  // Compila o DOCX para Word/Pages com as imagens incluídas
  return gerarDocxLaudo(dadosPaciente, laudoArray, caminhoDocx, logoPath, imagensPaths)
    .then(() => {
      return { caminhoPdf, caminhoDocx };
    });
}

module.exports = { gerarDocumentosExame };
