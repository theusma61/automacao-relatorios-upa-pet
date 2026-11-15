/**
 * Gerador de Relatório de Ultrassonografia Veterinária (Multi-Tenant / Padrão UPA PET)
 */

const fs = require('fs');
const { LAYOUT_PADRAO } = require('./gerenciador_layout');

function gerarRelatorioHTML(dadosPaciente, laudoTexto, imagensUrls = [], caminhoSaida = 'laudo_final.html', customLayout = null, opcoes = {}) {
  const layout = { ...LAYOUT_PADRAO, ...(customLayout || {}) };
  const usuario = opcoes.usuario || {};
  const nomeMedico = opcoes.nomeMedico || usuario.nome || 'Camila Bastos';
  const crmvMedico = opcoes.crmvMedico || usuario.crmv || 'CRMV/MG: 22904';
  const clinicaNome = opcoes.clinicaNome || usuario.nomeClinica || 'UPA PET';

  const paginasImagens = [];
  const fotosPorPagina = 8;

  for (let i = 0; i < imagensUrls.length; i += fotosPorPagina) {
    paginasImagens.push(imagensUrls.slice(i, i + fotosPorPagina));
  }

  const cabecalhoHTML = `
    <div class="header">
      <div class="logo-box">
        <div class="logo-text">${clinicaNome}</div>
      </div>
      <div class="patient-info">
        <div class="col">
          <p><strong>Nome:</strong> ${dadosPaciente.nome || ''}</p>
          <p><strong>Espécie:</strong> ${dadosPaciente.especie || ''}</p>
          <p><strong>Idade:</strong> ${dadosPaciente.idade || ''}</p>
        </div>
        <div class="col">
          <p><strong>Tutor:</strong> ${dadosPaciente.tutor || ''}</p>
          <p><strong>Sexo:</strong> ${dadosPaciente.sexo || ''}</p>
          <p><strong>Data:</strong> ${dadosPaciente.data || ''}</p>
        </div>
      </div>
    </div>
  `;

  const rodapeHTML = `
    <div class="footer">
      O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.
    </div>
  `;

  const textoFormatado = String(laudoTexto || '')
    .replace(/(BEXIGA:|RINS:|RIM ESQUERDO:|RIM DIREITO:|BAÇO:|ESTOMAGO:|FÍGADO:|VESICULA BILIAR:|ALÇAS INTESTINAIS:|GLANDULA ADRENAL:|ÚTERO:|OVÁRIOS:|OVÁRIO ESQUERDO:|OVÁRIO DIREITO:|ÚTERO \/ OVÁRIOS:|TESTICULOS:|PROSTATA:|PANCREAS:|PÂNCREAS:|CAVIDADE ABDOMINAL:|CONSIDERAÇÕES:)/g, '<br><strong>$1</strong>')
    .replace(/(DIAG DIF\.[^<\n]*|DIAG DIFERENCIAL\.[^<\n]*)/g, '<em>$1</em>');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Ultrassonografia - ${dadosPaciente.nome || 'Paciente'}</title>
  <style>
    @page {
      size: A4;
      margin: ${layout.margin_top} ${layout.margin_right} ${layout.margin_bottom} ${layout.margin_left};
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
    }
    body {
      font-family: ${layout.font_family};
      font-size: ${layout.font_size_body};
      line-height: ${layout.line_height};
      color: #111;
      margin: 0;
      padding: 0;
    }
    .page {
      position: relative;
      min-height: 267mm;
      max-height: 267mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
    }
    .logo-box {
      width: 130px;
    }
    .logo-text {
      font-weight: 900;
      font-size: 22pt;
      letter-spacing: -1px;
      color: ${layout.cor_primaria};
    }
    .patient-info {
      flex: 1;
      display: flex;
      justify-content: space-around;
      margin-left: 20px;
    }
    .patient-info .col p {
      margin: 2px 0;
      font-size: 10pt;
    }
    .title-box {
      text-align: center;
      margin: 10px 0 14px 0;
    }
    .title-box h1 {
      font-size: ${layout.font_size_titulo};
      font-weight: bold;
      margin: 0;
      letter-spacing: 0.5px;
      color: ${layout.cor_primaria};
    }
    .title-box p {
      font-size: 8pt;
      font-style: italic;
      margin: 2px 0 0 0;
      color: ${layout.cor_secundaria};
    }
    .content {
      flex: 1;
      text-align: justify;
      font-size: ${layout.font_size_body};
      line-height: ${layout.line_height};
    }
    .content p {
      margin: 0 0 ${layout.paragraph_spacing} 0;
    }
    .signature {
      text-align: right;
      margin-top: 15px;
      padding-right: 20px;
    }
    .signature p {
      margin: 1px 0;
      font-size: 9.5pt;
    }
    .footer {
      font-size: 7pt;
      font-style: italic;
      color: #555;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 5px;
      margin-top: 10px;
    }
    .image-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 8px;
      flex: 1;
      margin-top: 10px;
    }
    .image-grid .img-card {
      border: 1px solid #222;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 58mm;
      overflow: hidden;
    }
    .image-grid .img-card img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>

  <div class="page">
    ${cabecalhoHTML}
    <div class="title-box">
      <h1>RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL</h1>
      <p>Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo</p>
    </div>

    <div class="content">
      ${textoFormatado}
    </div>

    <div class="signature">
      <p><strong>${nomeMedico}</strong></p>
      <p>${crmvMedico}</p>
    </div>

    ${rodapeHTML}
  </div>

  ${paginasImagens.map((fotos) => `
    <div class="page">
      ${cabecalhoHTML}
      <div class="image-grid">
        ${fotos.map(foto => `
          <div class="img-card">
            <img src="${foto}" alt="Captura Ultrassom">
          </div>
        `).join('')}
      </div>
      ${rodapeHTML}
    </div>
  `).join('')}

</body>
</html>`;

  fs.writeFileSync(caminhoSaida, html, 'utf8');
  console.log('Laudo HTML gerado com sucesso em: ' + caminhoSaida);
}

module.exports = { gerarRelatorioHTML };
