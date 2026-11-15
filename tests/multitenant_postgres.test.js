const {
  obterPerfilUsuario,
  obterTemaUsuario,
  atualizarTemaUsuario,
  atualizarPerfilProfissional
} = require('../gerenciador_usuarios');

const {
  syncModelosDoJson,
  carregarModelosCirurgicos,
  salvarOuCriarModelo,
  clonarModeloParaUsuario,
  inferirModeloPorTexto,
  excluirModelo
} = require('../gerenciador_modelos');

describe('Plataforma Multi-Tenant PostgreSQL / Prisma (Usuários e Modelos Cirúrgicos)', () => {
  beforeAll(async () => {
    await syncModelosDoJson();
  });

  test('obterPerfilUsuario retorna id, dados de branding e temaPreferencia', async () => {
    const draCamila = await obterPerfilUsuario('camilabastos@upapet.com.br', 'Dra. Camila Bastos');
    expect(draCamila.id).toBeDefined();
    expect(draCamila.crmv).toBe('CRMV/MG: 22904');
    expect(draCamila.nomeClinica).toBe('UPA PET');
    expect(draCamila.temaPreferencia).toBe('system');
  });

  test('atualizarTemaUsuario e atualizarPerfilProfissional persistem corretamente', async () => {
    const vet = await obterPerfilUsuario('dr.parceiro@vetcare.com.br', 'Dr. João Silva');
    await atualizarTemaUsuario(vet.email, 'dark');
    const tema = await obterTemaUsuario(vet.email);
    expect(tema).toBe('dark');

    const atualizado = await atualizarPerfilProfissional(vet.id, {
      nome: 'Dr. João Silva',
      crmv: 'CRMV/SP: 55443',
      nomeClinica: 'Clínica Vet Care'
    });
    expect(atualizado.crmv).toBe('CRMV/SP: 55443');
    expect(atualizado.nomeClinica).toBe('Clínica Vet Care');
  });

  test('salvarOuCriarModelo previne colisão de ID com modelos globais e isola por médico', async () => {
    const vetA = await obterPerfilUsuario('veta@clinica.com', 'Dra. Ana');
    const vetB = await obterPerfilUsuario('vetb@clinica.com', 'Dr. Bruno');

    const modeloPrivadoA = await salvarOuCriarModelo({
      nome: 'Orquiectomia aberta',
      procedimento: 'Orquiectomia eletiva personalizada Dra. Ana',
      descricaoProcedimento: 'Técnica cirúrgica personalizada da Dra. Ana com síntese intradérmica e fios absorvíveis.'
    }, vetA);

    expect(modeloPrivadoA.isGlobal).toBe(false);
    expect(modeloPrivadoA.usuarioId).toBe(vetA.id);
    expect(modeloPrivadoA.id).toContain(`${vetA.id}__`);

    const listaVetB = await carregarModelosCirurgicos(vetB.id);
    expect(listaVetB.some(m => m.id === modeloPrivadoA.id)).toBe(false);

    const listaVetA = await carregarModelosCirurgicos(vetA.id);
    expect(listaVetA.some(m => m.id === modeloPrivadoA.id)).toBe(true);
    expect(listaVetA.some(m => m.isGlobal === true)).toBe(true);

    const inferidoA = await inferirModeloPorTexto('Orquiectomia aberta', vetA.id);
    expect(inferidoA.id).toBe(modeloPrivadoA.id);

    await expect(excluirModelo(modeloPrivadoA.id, vetB)).rejects.toThrow();

    const clonado = await clonarModeloParaUsuario('celiotomia_exploratoria', vetA);
    expect(clonado.isGlobal).toBe(false);
    expect(clonado.usuarioId).toBe(vetA.id);

    await expect(excluirModelo(modeloPrivadoA.id, vetA)).resolves.toBe(true);
    await expect(excluirModelo(clonado.id, vetA)).resolves.toBe(true);
  });
});
