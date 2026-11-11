const { layoutSchemas } = require('../validation');

describe('Validação Zod de Layout (validation.js)', () => {
  test('aceita payload de atualização válido completo', () => {
    const payload = {
      font_family: 'Arial, sans-serif',
      font_size_body: '10.5pt',
      font_size_titulo: '13pt',
      margin_top: '15mm',
      margin_bottom: '15mm',
      margin_left: '12mm',
      margin_right: '12mm',
      line_height: '1.35',
      paragraph_spacing: '7pt',
      cor_primaria: '#0284C7',
      cor_secundaria: '#0F766E'
    };

    const res = layoutSchemas.updateLayout.safeParse(payload);
    expect(res.success).toBe(true);
  });

  test('aceita payload de atualização parcial', () => {
    const payload = {
      cor_primaria: '#1B365D'
    };

    const res = layoutSchemas.updateLayout.safeParse(payload);
    expect(res.success).toBe(true);
  });

  test('rejeita payload vazio', () => {
    const res = layoutSchemas.updateLayout.safeParse({});
    expect(res.success).toBe(false);
  });

  test('rejeita tamanho de fonte de corpo fora da faixa segura (evitando quebra da Página Única)', () => {
    // 25pt é excessivamente grande para corpo
    const res = layoutSchemas.updateLayout.safeParse({ font_size_body: '25pt' });
    expect(res.success).toBe(false);
  });

  test('rejeita cor hexadecimal inválida', () => {
    const res = layoutSchemas.updateLayout.safeParse({ cor_primaria: 'azul-marinho' });
    expect(res.success).toBe(false);
  });

  test('rejeita margem com unidade inválida', () => {
    const res = layoutSchemas.updateLayout.safeParse({ margin_top: '20px' }); // deve ser mm
    expect(res.success).toBe(false);
  });
});
