/**
 * Testes Unitários de Assinatura, Cotas e Métricas de Consumo
 */

const {
  TABELA_PLANOS,
  obterOuCriarAssinatura,
  obterMetricasUsoAssinatura,
  atualizarPlanoAssinatura
} = require('../gerenciador_assinatura');
const { prisma } = require('../db');

describe('Gerenciador de Assinaturas e Cotas (PostgreSQL Multi-Tenant)', () => {
  let usuarioTesteId;

  beforeAll(async () => {
    // Garante um usuário para os testes
    let user = await prisma.usuario.findFirst();
    if (!user) {
      user = await prisma.usuario.create({
        data: {
          email: 'test_sub@vetaro.com',
          nome: 'Dra. Teste Assinatura',
          role: 'veterinario'
        }
      });
    }
    usuarioTesteId = user.id;
  });

  test('obterOuCriarAssinatura retorna uma assinatura ativa com cota e faturas', async () => {
    const sub = await obterOuCriarAssinatura(usuarioTesteId);
    expect(sub).toBeDefined();
    expect(sub.usuarioId).toBe(usuarioTesteId);
    expect(sub.status).toBe('ACTIVE');
    expect(sub.cotaLimite).toBeGreaterThanOrEqual(10);
    expect(sub.cicloInicio).toBeDefined();
    expect(sub.cicloFim).toBeDefined();
  });

  test('obterMetricasUsoAssinatura calcula cotas, métricas e histórico dos últimos 6 meses', async () => {
    const metricas = await obterMetricasUsoAssinatura(usuarioTesteId);
    expect(metricas).toBeDefined();

    // Plano e Cota
    expect(metricas.plano).toBeDefined();
    expect(metricas.cota).toBeDefined();
    expect(typeof metricas.cota.disponivel).toBe('number');
    expect(typeof metricas.cota.consumido).toBe('number');
    expect(metricas.cota.porcentagem).toBeGreaterThanOrEqual(0);

    // Breakdown
    expect(metricas.breakdown).toBeDefined();
    expect(typeof metricas.breakdown.ultrassom).toBe('number');
    expect(typeof metricas.breakdown.cirurgia).toBe('number');

    // Métricas de Valor (ROI)
    expect(metricas.metricasValor).toBeDefined();
    expect(typeof metricas.metricasValor.horasEconomizadas).toBe('number');
    expect(typeof metricas.metricasValor.custoEfetivoUnitario).toBe('number');
    expect(typeof metricas.metricasValor.faturamentoEstimado).toBe('number');

    // Histórico de 6 meses
    expect(Array.isArray(metricas.historicoMeses)).toBe(true);
    expect(metricas.historicoMeses.length).toBe(6);
  });

  test('atualizarPlanoAssinatura altera o plano e recalcula limites de cota', async () => {
    const res = await atualizarPlanoAssinatura(usuarioTesteId, 'CLINICA', 'mensal');
    expect(res.plano.chave).toBe('CLINICA');
    expect(res.cota.limite).toBe(TABELA_PLANOS.CLINICA.cotaLimite);
    expect(res.plano.preco).toBe(TABELA_PLANOS.CLINICA.precoMensal);

    // Retorna para PRO
    const resPro = await atualizarPlanoAssinatura(usuarioTesteId, 'PRO', 'mensal');
    expect(resPro.plano.chave).toBe('PRO');
    expect(resPro.cota.limite).toBe(TABELA_PLANOS.PRO.cotaLimite);
  });

  test('novo usuário registrado recebe plano GRATUITO com cota de 10 laudos por padrão', async () => {
    const novoUsuario = await prisma.usuario.create({
      data: {
        email: `novo_${Date.now()}@vetaro.com`,
        nome: 'Dra. Novata',
        role: 'veterinario'
      }
    });
    const sub = await obterOuCriarAssinatura(novoUsuario.id);
    expect(sub.plano).toBe('GRATUITO');
    expect(sub.cotaLimite).toBe(10);
    expect(Number(sub.precoMensal)).toBe(0);
    expect(sub.cartaoFinal).toBeNull();
  });
});
