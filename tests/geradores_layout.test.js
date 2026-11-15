const fs = require('fs');
const path = require('path');
const os = require('os');
const { gerarRelatorioHTML } = require('../gerar_html');
const { gerarDocxLaudo } = require('../gerar_docx');
const { restaurarLayoutPadrao } = require('../gerenciador_layout');

describe('Integração de Motores com Layout (gerar_html.js e gerar_docx.js)', () => {
  const tmpDir = os.tmpdir();
  const pacienteTeste = {
    nome: 'Thor',
    especie: 'Canina',
    idade: '4 anos',
    tutor: 'Maria Santos',
    sexo: 'Macho',
    data: '11/11/2026'
  };

  const laudoExemplo = [
    { orgao: 'BEXIGA', texto: 'Repleção adequada, paredes regulares.', diagDif: '' },
    { orgao: 'FÍGADO', texto: 'Dimensões normais, parênquima homogêneo.', diagDif: '' },
    { orgao: 'CONSIDERAÇÕES', texto: 'Exame ultrassonográfico sem alterações.', diagDif: '' }
  ];

  afterAll(async () => {
    await restaurarLayoutPadrao();
  });

  test('gerarRelatorioHTML injeta estilos configurados no CSS', () => {
    const caminhoHtml = path.join(tmpDir, `teste_html_layout_${Date.now()}.html`);
    const customLayout = {
      font_family: 'Arial, sans-serif',
      font_size_body: '10pt',
      font_size_titulo: '15pt',
      margin_top: '25mm',
      margin_bottom: '25mm',
      margin_left: '18mm',
      margin_right: '18mm',
      line_height: '1.3',
      paragraph_spacing: '9pt',
      cor_primaria: '#0284C7',
      cor_secundaria: '#0F766E'
    };

    const laudoTexto = 'BEXIGA: Normal.\nFÍGADO: Normal.\nCONSIDERAÇÕES: Normal.';
    gerarRelatorioHTML(pacienteTeste, laudoTexto, [], caminhoHtml, customLayout);

    expect(fs.existsSync(caminhoHtml)).toBe(true);
    const conteudo = fs.readFileSync(caminhoHtml, 'utf8');

    expect(conteudo).toContain('Arial, sans-serif');
    expect(conteudo).toContain('25mm 18mm 25mm 18mm');
    expect(conteudo).toContain('#0284C7');
    expect(conteudo).toContain('#0F766E');

    fs.unlinkSync(caminhoHtml);
  });

  test('gerarDocxLaudo gera arquivo .docx válido com layout e médico personalizados', async () => {
    const caminhoDocx = path.join(tmpDir, `teste_docx_layout_${Date.now()}.docx`);
    const customLayout = {
      font_family: 'Calibri, sans-serif',
      font_size_body: '11pt',
      font_size_titulo: '14pt',
      margin_top: '20mm',
      margin_bottom: '20mm',
      margin_left: '15mm',
      margin_right: '15mm',
      line_height: '1.4',
      paragraph_spacing: '8pt',
      cor_primaria: '#1B365D',
      cor_secundaria: '#4A777A'
    };

    await gerarDocxLaudo(pacienteTeste, laudoExemplo, caminhoDocx, null, [], customLayout, {
      nomeMedico: 'Dra. Camila Bastos',
      crmvMedico: 'CRMV/MG: 22904',
      clinicaNome: 'UPA PET'
    });

    expect(fs.existsSync(caminhoDocx)).toBe(true);
    const stats = fs.statSync(caminhoDocx);
    expect(stats.size).toBeGreaterThan(1000);

    fs.unlinkSync(caminhoDocx);
  });
});
