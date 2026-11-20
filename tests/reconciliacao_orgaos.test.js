const { reconciliarLaudoComOrdemOrgaos } = require('../analisador_ia');

describe('reconciliarLaudoComOrdemOrgaos', () => {
  test('deve dividir RINS em RIM ESQUERDO e RIM DIREITO com medidas corretas quando solicitado pelo usuário', () => {
    const laudoComRinsUnificados = [
      {
        orgao: 'BEXIGA',
        texto: 'Localizada em topografia habitual...',
        diagDif: 'CISTITE'
      },
      {
        orgao: 'RINS',
        texto: 'Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: 4,13 cm; RD: 5,01 cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córtico-medular. Não há evidências de litíase ou hidronefrose.',
        diagDif: 'NEFROPATIA'
      },
      {
        orgao: 'BAÇO',
        texto: 'Localizado em topografia habitual...',
        diagDif: ''
      }
    ];

    const ordemDesejada = ['BEXIGA', 'RIM ESQUERDO', 'RIM DIREITO', 'BAÇO'];

    const resultado = reconciliarLaudoComOrdemOrgaos(laudoComRinsUnificados, ordemDesejada);

    expect(resultado.length).toBe(4);
    expect(resultado[0].orgao).toBe('BEXIGA');
    expect(resultado[1].orgao).toBe('RIM ESQUERDO');
    expect(resultado[1].texto).toContain('4,13 cm');
    expect(resultado[1].diagDif).toBe('NEFROPATIA');

    expect(resultado[2].orgao).toBe('RIM DIREITO');
    expect(resultado[2].texto).toContain('5,01 cm');
    expect(resultado[2].diagDif).toBe('NEFROPATIA');

    expect(resultado[3].orgao).toBe('BAÇO');
  });

  test('deve unificar RIM ESQUERDO e RIM DIREITO em RINS quando o usuário configurar RINS unificado', () => {
    const laudoComRinsSeparados = [
      {
        orgao: 'BEXIGA',
        texto: 'Localizada em topografia habitual...'
      },
      {
        orgao: 'RIM ESQUERDO',
        texto: 'Localizado em topografia habitual, medindo 4,13 cm...',
        diagDif: 'NEFROPATIA E'
      },
      {
        orgao: 'RIM DIREITO',
        texto: 'Localizado em topografia habitual, medindo 5,01 cm...',
        diagDif: 'NEFROPATIA D'
      },
      {
        orgao: 'BAÇO',
        texto: 'Localizado em topografia habitual...'
      }
    ];

    const ordemDesejada = ['BEXIGA', 'RINS', 'BAÇO'];

    const resultado = reconciliarLaudoComOrdemOrgaos(laudoComRinsSeparados, ordemDesejada);

    expect(resultado.length).toBe(3);
    expect(resultado[0].orgao).toBe('BEXIGA');
    expect(resultado[1].orgao).toBe('RINS');
    expect(resultado[1].texto).toContain('RE: 4,13 cm');
    expect(resultado[1].texto).toContain('RD: 5,01 cm');
    expect(resultado[1].diagDif).toContain('NEFROPATIA E');
    expect(resultado[1].diagDif).toContain('NEFROPATIA D');
    expect(resultado[2].orgao).toBe('BAÇO');
  });

  test('deve reordenar os órgãos de acordo com a sequência exata de ordemDesejada', () => {
    const laudoDesordenado = [
      { orgao: 'BAÇO', texto: 'Baço...' },
      { orgao: 'RIM DIREITO', texto: 'RD 5,01 cm...' },
      { orgao: 'BEXIGA', texto: 'Bexiga...' },
      { orgao: 'RIM ESQUERDO', texto: 'RE 4,13 cm...' }
    ];

    const ordemDesejada = ['BEXIGA', 'RIM ESQUERDO', 'RIM DIREITO', 'BAÇO'];

    const resultado = reconciliarLaudoComOrdemOrgaos(laudoDesordenado, ordemDesejada);

    expect(resultado.map(r => r.orgao)).toEqual(['BEXIGA', 'RIM ESQUERDO', 'RIM DIREITO', 'BAÇO']);
  });
});
