const fs = require('fs');
const path = require('path');

const pastaExame = "C:\\Users\\matheus.augusto\\OneDrive - Administrativo - Ânima Educação\\Documentos\\Teste laudo";
const logoPath = path.join(pastaExame, 'logo_upa_pet.jpg');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const dadosPaciente = {
  nome: "Lua",
  especie: "Canina",
  idade: "Não informada",
  tutor: "Nilda",
  sexo: "Fêmea",
  data: "02/09/2026"
};

const laudoTextoHTML = `
<p><strong>BEXIGA:</strong> Localizada em topografia habitual, com formato preservado e repleção liquida adequada. Paredes normoespessas, medindo 0,10 cm, com margens internas regulares. Conteúdo anecogênico e homogêneo.</p>

<p><strong>RINS:</strong> Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: 3,19 cm; RD: 3,44 cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córtico-medular. Não há evidências de litíase ou hidronefrose.</p>

<p><strong>BAÇO:</strong> Localizado em topografia habitual, com contornos regulares e bem definidos, com dimensões aumentadas, estendendo-se caudalmete e ultrapassando o polo cranial do rim esquerdo, parênquima com ecogenicidade usual e ecotextura homogênea. <em>DIAG DIF.: PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES.</em></p>

<p><strong>ESTOMAGO:</strong> Localizado em topografia habitual, paredes normoespessas, medindo 0,18 cm, mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas, pouca quantidade de gás em seu lúmen.</p>

<p><strong>FÍGADO:</strong> Localizado em topografia habitual, apresenta-se, na porção visível, com dimensões aparentemente preservadas e contornos regulares. O parênquima hepático demonstra ecogenicidade e ecotextura homogênea. Não foram observadas lesões focais, massas ou dilatação das vias biliares intra-hepáticas.</p>

<p><strong>VESICULA BILIAR:</strong> Paredes normoespessas, medindo 0,06 cm, margem interna regular, repleta por conteúdo anecogênico e homogêneo. Ducto cístico sem evidências de dilatação.</p>

<p><strong>ALÇAS INTESTINAIS:</strong> Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (0,20 cm) e jejuno (0,12 cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total.</p>

<p><strong>GLANDULA ADRENAL:</strong> Não visualizadas.</p>

<p><strong>ÚTERO:</strong> Localizado em topografia habitual. Corpo e cornos uterinos apresentando dilatação (CUE: 2,05 cm; CUD: 1,54 cm), medindo corpo uterino 1,15 cm, com aspecto tubular e paredes irregulares e espessadas. Lúmen preenchido por conteúdo anecogênico, predominantemente homogêneo, contendo discretos pontos hipoecogênicos em suspensão. <em>DIAG DIF.: PIOMETRA, MUCOMETRA.</em></p>

<p><strong>PANCREAS:</strong> Sem alteração em topografia de pâncreas.</p>

<p><strong>CAVIDADE ABDOMINAL:</strong> Ausência de liquido livre, sem alterações evidentes em linfonodos abominais.</p>

<p><strong>CONSIDERAÇÕES:</strong> Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares.</p>
`;

// Lista arquivos de imagens excluindo o logo
const arquivos = fs.readdirSync(pastaExame)
  .filter(f => (f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')) && !f.includes('logo_upa_pet'));

// Divide em blocos de 8 por página
const paginasImagens = [];
for (let i = 0; i < arquivos.length; i += 8) {
  paginasImagens.push(arquivos.slice(i, i + 8));
}

const cabecalho = `
  <div class="header">
    <div class="logo-box">
      <img src="data:image/jpeg;base64,${logoBase64}" class="logo-img" alt="UPA PET">
    </div>
    <div class="patient-info">
      <div class="col">
        <p><strong>Nome:</strong> <span contenteditable="true">${dadosPaciente.nome}</span></p>
        <p><strong>Espécie:</strong> <span contenteditable="true">${dadosPaciente.especie}</span></p>
        <p><strong>Idade:</strong> <span contenteditable="true">${dadosPaciente.idade}</span></p>
      </div>
      <div class="col">
        <p><strong>Tutor:</strong> <span contenteditable="true">${dadosPaciente.tutor}</span></p>
        <p><strong>Sexo:</strong> <span contenteditable="true">${dadosPaciente.sexo}</span></p>
        <p><strong>Data:</strong> <span contenteditable="true">${dadosPaciente.data}</span></p>
      </div>
    </div>
  </div>
`;

const rodape = `
  <div class="footer">
    O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.
  </div>
`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Ultrassonografia - ${dadosPaciente.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.8pt;
      line-height: 1.28;
      color: #111;
      margin: 0;
      padding: 0;
      background-color: #f0f2f5;
    }
    .floating-bar {
      position: fixed;
      top: 15px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    .btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .btn:hover {
      background: #0056b3;
    }
    .page-container {
      width: 210mm;
      height: 297mm;
      margin: 20px auto;
      background: white;
      padding: 12mm 15mm 10mm 15mm;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    @media print {
      body {
        background: transparent;
      }
      .floating-bar {
        display: none;
      }
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
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 2px;
    }
    .logo-box {
      width: 140px;
      display: flex;
      align-items: center;
    }
    .logo-img {
      max-width: 130px;
      max-height: 50px;
      object-fit: contain;
    }
    .patient-info {
      flex: 1;
      display: flex;
      justify-content: space-around;
      margin-left: 15px;
    }
    .patient-info .col p {
      margin: 1.5px 0;
      font-size: 9.3pt;
    }

    /* ESPAÇOS ("ENTER") ANTES E DEPOIS DO BLOCO DE TÍTULO */
    .title-box {
      text-align: center;
      margin-top: 18px;    /* Enter antes da escrita RELATÓRIO */
      margin-bottom: 18px; /* Enter depois do texto explicativo */
    }
    .title-box h1 {
      font-size: 10.5pt;
      font-weight: bold;
      margin: 0;
      letter-spacing: 0.3px;
    }
    .title-box p {
      font-size: 7.5pt;
      font-style: italic;
      margin: 3px 0 0 0;
      color: #333;
    }

    .content {
      flex: 1;
      text-align: justify;
      font-size: 8.6pt;
      line-height: 1.3;
      outline: none;
    }
    /* Espaçamento entre cada órgão */
    .content p {
      margin: 0 0 7.5px 0;
    }

    .signature {
      text-align: right;
      margin-top: 6px;
      padding-right: 15px;
    }
    .signature p {
      margin: 1px 0;
      font-size: 8.8pt;
    }
    .footer {
      font-size: 7pt;
      font-style: italic;
      color: #555;
      text-align: center;
      border-top: 1px solid #ccc;
      padding-top: 4px;
      margin-top: 6px;
    }

    /* Grid de Imagens */
    .image-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 6px;
      flex: 1;
      margin-top: 6px;
      align-content: start;
    }
    .img-card {
      border: 1px solid #222;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 52mm;
      overflow: hidden;
    }
    .img-card img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>

  <div class="floating-bar">
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
  </div>

  <!-- PÁGINA 1: TEXTO DO LAUDO -->
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

  <!-- PÁGINAS SEGUINTES: MOSAICO DE IMAGENS -->
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

const caminhoHTML = path.join(pastaExame, 'Laudo_Lua_Nilda.html');
fs.writeFileSync(caminhoHTML, html, 'utf8');
console.log("Arquivo HTML atualizado com os espaçamentos solicitados em: " + caminhoHTML);
