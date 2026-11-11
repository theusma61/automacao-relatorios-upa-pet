const {
  LAYOUT_PADRAO,
  obterLayout,
  salvarLayout,
  restaurarLayoutPadrao,
  converterParaDocx,
  medidaParaTwips,
  ptParaHalfPoints
} = require('../gerenciador_layout');

describe('Gerenciador de Layout (gerenciador_layout.js)', () => {
  beforeEach(() => {
    // Garante que o banco comece com o layout padrão
    restaurarLayoutPadrao();
  });

  afterAll(() => {
    // Restaura o padrão ao final
    restaurarLayoutPadrao();
  });

  test('obterLayout retorna o layout padrão com todos os campos esperados', () => {
    const layout = obterLayout();
    expect(layout).toBeDefined();
    expect(layout.id).toBe('padrao');
    expect(layout.font_family).toBe('Calibri, sans-serif');
    expect(layout.font_size_body).toBe('11pt');
    expect(layout.font_size_titulo).toBe('14pt');
    expect(layout.margin_top).toBe('20mm');
    expect(layout.cor_primaria).toBe('#1B365D');
    expect(layout.cor_secundaria).toBe('#4A777A');
  });

  test('salvarLayout atualiza propriedades selecionadas e preserva as demais', () => {
    const atualizado = salvarLayout({
      font_family: 'Arial, sans-serif',
      cor_primaria: '#0284C7',
      margin_top: '15mm'
    });

    expect(atualizado.font_family).toBe('Arial, sans-serif');
    expect(atualizado.cor_primaria).toBe('#0284C7');
    expect(atualizado.margin_top).toBe('15mm');
    // Campos não enviados devem ser preservados
    expect(atualizado.font_size_body).toBe('11pt');
    expect(atualizado.margin_bottom).toBe('20mm');
  });

  test('restaurarLayoutPadrao reseta os valores para a configuração oficial', () => {
    salvarLayout({
      font_family: 'Times New Roman, serif',
      cor_primaria: '#FF0000'
    });

    const resetado = restaurarLayoutPadrao();
    expect(resetado.font_family).toBe('Calibri, sans-serif');
    expect(resetado.cor_primaria).toBe('#1B365D');
  });

  describe('Conversão de Unidades para DOCX (converterParaDocx)', () => {
    test('converte mm para twips corretamente (20mm ~ 1134 twips, 15mm ~ 850 twips)', () => {
      expect(medidaParaTwips('20mm')).toBe(1134);
      expect(medidaParaTwips('15mm')).toBe(850);
      expect(medidaParaTwips('10pt')).toBe(200);
    });

    test('converte tamanhos em pt para half-points (11pt -> 22, 14pt -> 28)', () => {
      expect(ptParaHalfPoints('11pt')).toBe(22);
      expect(ptParaHalfPoints('14pt')).toBe(28);
      expect(ptParaHalfPoints('10.5pt')).toBe(21);
    });

    test('converterParaDocx gera objeto completo compatível com biblioteca docx', () => {
      const docxCfg = converterParaDocx({
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
      });

      expect(docxCfg.fontFamily).toBe('Calibri');
      expect(docxCfg.szCorpo).toBe(22);
      expect(docxCfg.szTitulo).toBe(28);
      expect(docxCfg.marginTop).toBe(1134);
      expect(docxCfg.marginLeft).toBe(850);
      expect(docxCfg.spacingAfter).toBe(160); // 8pt * 20 twips
      expect(docxCfg.lineSpacing).toBe(336);  // 1.4 * 240
      expect(docxCfg.corPrimariaHex).toBe('1B365D');
      expect(docxCfg.corSecundariaHex).toBe('4A777A');
    });
  });
});
