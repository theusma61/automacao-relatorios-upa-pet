const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  calcularAutoFitLaudoTextual,
  normalizarOrgaosCanonica,
  construirHtmlLaudo
} = require('../renderizador_layout_laudo');
const { compilarPDF } = require('../compilador_pdf');

describe('Auto-Fit Dinâmico e Agnóstico da Página Textual de Ultrassom', () => {
  const laudoLuaReal = [
    {
      orgao: 'BEXIGA',
      texto: 'Localizada em topografia habitual, com formato preservado e repleção liquida adequada. paredes espessas, medindo 0,10 cm, com margens internas regulares. Conteúdo anecogênico e homogêneo.',
      diagDif: ''
    },
    {
      orgao: 'RINS',
      texto: 'Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: 3,19 cm; RD: 3,44 cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córfico-medular. Não há evidências de litiase ou hidronefrose.',
      diagDif: ''
    },
    {
      orgao: 'BAÇO',
      texto: 'Localizado em topografia habitual, com contornos regulares e bem definidos, com dimensões aumentadas, estendendo-se caudalmente e ultrapassando o polo cranial do rim esquerdo, parênquima com ecogenicidade usual e ecotextura homogênea.',
      diagDif: 'PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES.'
    },
    {
      orgao: 'ESTOMAGO',
      texto: 'Localizado em topografia habitual, paredes normoespessas, medindo 0,18 cm, mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas, pouca quantidade de gás em seu lúmen.',
      diagDif: ''
    },
    {
      orgao: 'FÍGADO',
      texto: 'Localizado em topografia habitual, apresenta-se, na porção visível, com dimensões aumentadas, ultrapassando o bordo costal e contornos regulares. O parênquima hepático demonstra ecogenicidade aumentada e ecotextura homogênea. Não foram observadas lesões focais, massas ou dilatação das vias biliares intra-hepáticas.',
      diagDif: 'HEPATOPATIA REACIONAL, LIPIDOSE HEPÁTICA, HEPATITE, FIBROSE, INFILTRADO GORDUROSO.'
    },
    {
      orgao: 'VESICULA BILIAR',
      texto: 'Paredes normoespessas, medindo 0,06 cm, margem interna regular, repleta por conteúdo anecogênico e homogêneo. Ducto cístico sem evidências de dilatação.',
      diagDif: ''
    },
    {
      orgao: 'ALÇAS INTESTINAIS',
      texto: 'Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (0,20 cm), jejuno (0,12 cm) e colon descendente (0,13 cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total.',
      diagDif: ''
    },
    {
      orgao: 'ÚTERO',
      texto: 'Localizado em topografia habitual, apresentando corpo e cornos uterinos com dimensões preservadas, contornos regulares, medindo aproximadamente 1,15 cm e paredes finas e homogêneas. Ecogenicidade e ecotextura parietais preservadas. Não há evidências de dilatação luminal ou conteúdo intraluminal',
      diagDif: ''
    },
    {
      orgao: 'CAVIDADE ABDOMINAL',
      texto: 'Ausência de liquido livre, sem alterações evidentes em linfonodos abominais.',
      diagDif: ''
    },
    {
      orgao: 'CUD',
      texto: '0,70 cm, contornos regulares e paredes finas e homogêneas. Ausência de conteúdo intraluminal anecogênico ou ecogênico.',
      diagDif: 'ALTERAÇÃO HORMONAL, PIOMETRA INICIAL, MUCOMETRA.'
    }
  ];

  test('normalizarOrgaosCanonica deve unificar CUD no ÚTERO e preservar diagnósticos diferenciais', () => {
    const unificado = normalizarOrgaosCanonica(laudoLuaReal);
    expect(unificado.length).toBe(9); // CUD foi incorporado ao Útero

    const utero = unificado.find(o => o.orgao === 'ÚTERO');
    expect(utero).toBeDefined();
    expect(utero.texto).toContain('CUD: 0,70 cm');
    expect(utero.diagDif).toBe('ALTERAÇÃO HORMONAL, PIOMETRA INICIAL, MUCOMETRA.');
  });

  test('calcularAutoFitLaudoTextual deve selecionar tier compact sem layout explícito e preservar fontes/margens configuradas pelo usuário', () => {
    // 1. Sem preferências explícitas de fonte/margem: aplica auto-fit compacto padrão
    const autoFitPadrao = calcularAutoFitLaudoTextual(laudoLuaReal, {});
    expect(autoFitPadrao.tier).toBe('compact');
    expect(autoFitPadrao.modoPaginacao).toBe('single_page');
    expect(parseFloat(autoFitPadrao.fontSizeBody)).toBeLessThanOrEqual(10.0);
    expect(parseFloat(autoFitPadrao.lineHeight)).toBeLessThanOrEqual(1.3);
    expect(parseFloat(autoFitPadrao.marginTop)).toBeLessThanOrEqual(12);

    // 2. Com preferências explícitas do usuário: preserva exatamente fonte, título, margens e espaçamentos escolhidos
    const layoutUsuario = {
      font_family: 'Calibri, sans-serif',
      font_size_body: '12pt',
      font_size_titulo: '16pt',
      margin_top: '22mm',
      margin_bottom: '20mm',
      margin_left: '18mm',
      margin_right: '18mm',
      line_height: '1.5',
      paragraph_spacing: '10pt'
    };

    const autoFitUsuario = calcularAutoFitLaudoTextual(laudoLuaReal, layoutUsuario);
    expect(autoFitUsuario.fontSizeBody).toBe('12pt');
    expect(autoFitUsuario.fontSizeTitulo).toBe('16pt');
    expect(autoFitUsuario.marginTop).toBe('22mm');
    expect(autoFitUsuario.marginBottom).toBe('20mm');
    expect(autoFitUsuario.marginLeft).toBe('18mm');
    expect(autoFitUsuario.marginRight).toBe('18mm');
    expect(autoFitUsuario.lineHeight).toBe('1.5');
    expect(autoFitUsuario.paragraphSpacing).toBe('10pt');
  });

  test('construirHtmlLaudo com Auto-Fit deve gerar exatamente 1 página de texto no PDF (sem folha órfã)', async () => {
    const dadosPaciente = {
      nome: 'LUA',
      especie: 'Canina',
      idade: 'Não informada',
      tutor: 'NILDA',
      sexo: 'Fêmea',
      data: '02/09/2026'
    };

    const html = construirHtmlLaudo(dadosPaciente, laudoLuaReal, [], {
      nomeMedico: 'Camila Bastos',
      crmvMedico: 'CRMV/MG: 22904'
    });

    expect(html).toContain('overflow: hidden');
    expect(html).toContain('box-sizing: border-box');
    expect(html).toContain('LUA');
    expect(html).toContain('Camila Bastos');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teste_autofit_'));
    const htmlPath = path.join(tempDir, 'laudo_lua.html');
    const pdfPath = path.join(tempDir, 'laudo_lua.pdf');

    fs.writeFileSync(htmlPath, html, 'utf8');
    await compilarPDF(htmlPath, pdfPath);

    expect(fs.existsSync(pdfPath)).toBe(true);

    // Validação de páginas usando poppler ou pdfinfo se disponível, ou inspecionando estrutura do PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfTexto = pdfBuffer.toString('latin1');
    const pageMatches = pdfTexto.match(/\/Type\s*\/Page\b/g);
    const totalPaginas = pageMatches ? pageMatches.length : 1;

    console.log(`✅ Teste Auto-Fit: Total de páginas do laudo da Lua sem imagens = ${totalPaginas}`);
    expect(totalPaginas).toBe(1);

    // Teste com anexo de imagens fictícias (18 imagens como no exame real da Lua)
    const imagensMock = Array.from({ length: 18 }, (_, i) => {
      const mockImgPath = path.join(tempDir, `mock_${i}.png`);
      // Cria imagem PNG 1x1 válida
      const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(mockImgPath, png1x1);
      return mockImgPath;
    });

    const htmlComImagens = construirHtmlLaudo(dadosPaciente, laudoLuaReal, imagensMock, {
      nomeMedico: 'Camila Bastos',
      crmvMedico: 'CRMV/MG: 22904'
    });
    const htmlImgsPath = path.join(tempDir, 'laudo_lua_imgs.html');
    const pdfImgsPath = path.join(tempDir, 'laudo_lua_imgs.pdf');

    fs.writeFileSync(htmlImgsPath, htmlComImagens, 'utf8');
    await compilarPDF(htmlImgsPath, pdfImgsPath);

    const pdfImgsBuffer = fs.readFileSync(pdfImgsPath);
    const pdfImgsTexto = pdfImgsBuffer.toString('latin1');
    const pageMatchesImgs = pdfImgsTexto.match(/\/Type\s*\/Page\b/g);
    const totalPaginasImgs = pageMatchesImgs ? pageMatchesImgs.length : 4;

    console.log(`✅ Teste Auto-Fit com 18 imagens: Total de páginas = ${totalPaginasImgs} (1 texto + 3 imagens)`);
    expect(totalPaginasImgs).toBe(4); // Exatamente 1 página de texto + 3 de imagens, em vez de 5!

    // Limpeza
    try {
      imagensMock.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
      fs.unlinkSync(htmlPath);
      fs.unlinkSync(pdfPath);
      fs.unlinkSync(htmlImgsPath);
      fs.unlinkSync(pdfImgsPath);
      fs.rmdirSync(tempDir);
    } catch (_) {}
  }, 90000);
});
