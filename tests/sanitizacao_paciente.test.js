const { sanitizarDadosPaciente } = require('../analisador_ia');

describe('Sanitização e Separação de Dados do Paciente e Tutor (Mindray)', () => {
  test('deve separar nome do animal e tutor quando vierem juntos com vírgula (LUA, NILDA)', () => {
    const entrada = {
      nome: 'LUA, NILDA',
      tutor: 'UPA PET - CONTAGEM',
      especie: 'Canina',
      sexo: 'Fêmea',
      data: '02/09/2026'
    };

    const resultado = sanitizarDadosPaciente(entrada, 'UPA PET');

    expect(resultado.nome).toBe('LUA');
    expect(resultado.tutor).toBe('NILDA');
    expect(resultado.especie).toBe('Canina');
  });

  test('deve separar nome do animal e tutor com barra (LUA / NILDA) quando tutor for nome de clínica', () => {
    const entrada = {
      nome: 'LUA / NILDA',
      tutor: 'UPA PET',
      especie: 'Canina'
    };

    const resultado = sanitizarDadosPaciente(entrada);

    expect(resultado.nome).toBe('LUA');
    expect(resultado.tutor).toBe('NILDA');
  });

  test('deve manter nome e tutor normais quando já vierem separados corretamente', () => {
    const entrada = {
      nome: 'Thor',
      tutor: 'Carlos Alberto',
      especie: 'Canina'
    };

    const resultado = sanitizarDadosPaciente(entrada);

    expect(resultado.nome).toBe('Thor');
    expect(resultado.tutor).toBe('Carlos Alberto');
  });

  test('deve preencher "Não informado" quando tutor for nome de hospital/clínica e não houver tutor no campo nome', () => {
    const entrada = {
      nome: 'Thor',
      tutor: 'Hospital Veterinário UPA PET Contagem',
      especie: 'Canina'
    };

    const resultado = sanitizarDadosPaciente(entrada);

    expect(resultado.nome).toBe('Thor');
    expect(resultado.tutor).toBe('Não informado');
  });

  test('não deve quebrar se o nome tiver sufixo que não seja tutor (ex: Canina ou Macho)', () => {
    const entrada = {
      nome: 'Bob, Canino',
      tutor: 'Maria Silva'
    };

    const resultado = sanitizarDadosPaciente(entrada);

    expect(resultado.nome).toBe('Bob, Canino');
    expect(resultado.tutor).toBe('Maria Silva');
  });
});
