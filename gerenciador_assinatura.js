/**
 * Gerenciador de Assinaturas, Cotas e Métricas de Consumo — Vetaro SaaS
 */

const { prisma } = require('./db');

const TABELA_PLANOS = {
  GRATUITO: {
    chave: 'GRATUITO',
    nome: 'Degustação Gratuita',
    cotaLimite: 10,
    precoMensal: 0.0,
    precoAnualMensalizado: 0.0,
    descricao: '10 laudos gratuitos para testar a ferramenta com IA + Cirurgias ilimitadas',
    excedentePermitido: false
  },
  TRIAL: {
    chave: 'GRATUITO',
    nome: 'Degustação Gratuita',
    cotaLimite: 10,
    precoMensal: 0.0,
    precoAnualMensalizado: 0.0,
    descricao: '10 laudos gratuitos para testar a ferramenta com IA + Cirurgias ilimitadas',
    excedentePermitido: false
  },
  SOLO: {
    chave: 'SOLO',
    nome: 'Solo / Volante',
    cotaLimite: 40,
    precoMensal: 79.0,
    precoAnualMensalizado: 63.0,
    descricao: 'Ideal para médicos veterinários autônomos e volantes (Até 40 laudos/mês)',
    excedentePermitido: true,
    custoExcedente: 2.50
  },
  PRO: {
    chave: 'PRO',
    nome: 'Especialista Pro',
    cotaLimite: 150,
    precoMensal: 149.0,
    precoAnualMensalizado: 119.0,
    descricao: 'Ideal para ultrassonografistas e especialistas em imagem (Até 150 laudos/mês)',
    excedentePermitido: true,
    custoExcedente: 1.50
  },
  CLINICA: {
    chave: 'CLINICA',
    nome: 'Clínica & Hospital 24h',
    cotaLimite: 500,
    precoMensal: 297.0,
    precoAnualMensalizado: 237.0,
    descricao: 'Ideal para clínicas com setor de imagem e hospitais 24h (Até 500 laudos/mês)',
    excedentePermitido: true,
    custoExcedente: 1.00
  }
};

/**
 * Obtém ou cria a assinatura do usuário no PostgreSQL.
 * Se o ciclo mensal tiver vencido, renova o ciclo automaticamente.
 * Por padrão, novos usuários recebem o plano GRATUITO com 10 laudos de cortesia.
 */
async function obterOuCriarAssinatura(usuarioId) {
  if (!usuarioId) throw new Error('ID do usuário é obrigatório.');

  let sub = await prisma.assinatura.findUnique({
    where: { usuarioId },
    include: {
      faturas: {
        orderBy: { dataFatura: 'desc' },
        take: 12
      }
    }
  });

  const agora = new Date();

  if (!sub) {
    const umMesDepois = new Date(agora);
    umMesDepois.setDate(umMesDepois.getDate() + 30);

    const planoDef = TABELA_PLANOS.GRATUITO;

    sub = await prisma.assinatura.create({
      data: {
        usuarioId,
        plano: 'GRATUITO',
        status: 'ACTIVE',
        precoMensal: 0.0,
        ciclo: 'mensal',
        cotaLimite: planoDef.cotaLimite, // 10
        cicloInicio: agora,
        cicloFim: umMesDepois,
        cartaoFinal: null,
        cartaoBandeira: null,
        faturas: {
          create: [
            {
              valor: 0.0,
              status: 'pago',
              dataFatura: agora,
              descricao: 'Vetaro Degustação — 10 Laudos Gratuitos de Cortesia'
            }
          ]
        }
      },
      include: {
        faturas: {
          orderBy: { dataFatura: 'desc' }
        }
      }
    });
  } else if (agora > sub.cicloFim) {
    // Renovação automática do ciclo mensal
    const novoFim = new Date(agora);
    novoFim.setDate(novoFim.getDate() + 30);

    sub = await prisma.assinatura.update({
      where: { id: sub.id },
      data: {
        cicloInicio: agora,
        cicloFim: novoFim
      },
      include: {
        faturas: {
          orderBy: { dataFatura: 'desc' }
        }
      }
    });
  }

  return sub;
}

/**
 * Calcula todas as métricas reais de uso, consumo de cota e histórico dos últimos 6 meses.
 */
async function obterMetricasUsoAssinatura(usuarioId) {
  const assinatura = await obterOuCriarAssinatura(usuarioId);
  const planoKey = (assinatura.plano || 'PRO').toUpperCase();
  const planoDef = TABELA_PLANOS[planoKey] || TABELA_PLANOS.PRO;

  // 1. Contagem real no ciclo atual
  const [ultrassomCicloQtd, cirurgiaCicloQtd] = await Promise.all([
    prisma.exameLaudo.count({
      where: {
        usuarioId,
        criadoEm: {
          gte: assinatura.cicloInicio,
          lte: assinatura.cicloFim
        }
      }
    }),
    prisma.relatorioCirurgico.count({
      where: {
        usuarioId,
        criadoEm: {
          gte: assinatura.cicloInicio,
          lte: assinatura.cicloFim
        }
      }
    })
  ]);

  const agora = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasRestantes = Math.max(0, Math.ceil((assinatura.cicloFim - agora) / msPorDia));

  const cotaLimite = assinatura.cotaLimite || planoDef.cotaLimite;
  const disponivel = Math.max(0, cotaLimite - ultrassomCicloQtd);
  const porcentagemUso = cotaLimite > 0
    ? Number(Math.min(100, (ultrassomCicloQtd / cotaLimite) * 100).toFixed(1))
    : 100;

  const excedenteQtd = Math.max(0, ultrassomCicloQtd - cotaLimite);
  const excedenteValor = excedenteQtd * 1.50;

  // 2. Histórico real dos últimos 6 meses
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const historicoMeses = [];

  for (let i = 5; i >= 0; i--) {
    const dRef = new Date();
    dRef.setMonth(dRef.getMonth() - i);
    const ano = dRef.getFullYear();
    const mes = dRef.getMonth();

    const inicioMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

    const [uQtd, cQtd] = await Promise.all([
      prisma.exameLaudo.count({
        where: {
          usuarioId,
          criadoEm: { gte: inicioMes, lte: fimMes }
        }
      }),
      prisma.relatorioCirurgico.count({
        where: {
          usuarioId,
          criadoEm: { gte: inicioMes, lte: fimMes }
        }
      })
    ]);

    historicoMeses.push({
      mes: `${nomesMeses[mes]}/${String(ano).slice(2)}`,
      ultrassom: uQtd,
      cirurgia: cQtd,
      total: uQtd + cQtd
    });
  }

  // 3. Indicadores Financeiros e de Produtividade (ROI)
  // Cada exame de ultrassom economiza ~25 min e cada cirurgia ~15 min
  const minutosEconomizados = (ultrassomCicloQtd * 25) + (cirurgiaCicloQtd * 15);
  const horasEconomizadas = Number((minutosEconomizados / 60).toFixed(1));

  // Custo médio por laudo emitido dentro da assinatura
  const precoNum = Number(assinatura.precoMensal) || planoDef.precoMensal;
  const custoEfetivoUnitario = ultrassomCicloQtd > 0
    ? Number((precoNum / ultrassomCicloQtd).toFixed(2))
    : precoNum;

  // Faturamento estimado gerado com base no preço de mercado de exame (~R$ 160)
  const faturamentoEstimado = ultrassomCicloQtd * 160.0;
  const impactoPercentualFaturamento = faturamentoEstimado > 0
    ? Number(((precoNum / faturamentoEstimado) * 100).toFixed(2))
    : 0;

  return {
    plano: {
      chave: planoKey,
      nome: planoDef.nome,
      preco: precoNum,
      ciclo: assinatura.ciclo,
      status: assinatura.status,
      cicloInicio: assinatura.cicloInicio,
      cicloFim: assinatura.cicloFim,
      diasRestantes,
      cartaoFinal: assinatura.cartaoFinal || null,
      cartaoBandeira: assinatura.cartaoBandeira || null,
      descricao: planoDef.descricao
    },
    cota: {
      limite: cotaLimite,
      consumido: ultrassomCicloQtd,
      disponivel,
      porcentagem: porcentagemUso
    },
    breakdown: {
      ultrassom: ultrassomCicloQtd,
      cirurgia: cirurgiaCicloQtd,
      totalDocumentos: ultrassomCicloQtd + cirurgiaCicloQtd,
      excedenteQtd,
      excedenteValor
    },
    metricasValor: {
      horasEconomizadas,
      custoEfetivoUnitario,
      faturamentoEstimado,
      impactoPercentualFaturamento
    },
    historicoMeses,
    faturas: (assinatura.faturas || []).map((f) => ({
      id: f.id,
      data: f.dataFatura,
      valor: Number(f.valor),
      status: f.status,
      descricao: f.descricao,
      pdfUrl: f.pdfUrl || null
    }))
  };
}

/**
 * Atualiza o plano da assinatura do usuário (Upgrade / Downgrade).
 */
async function atualizarPlanoAssinatura(usuarioId, novoPlano, ciclo = 'mensal') {
  const planoKey = (novoPlano || 'PRO').toUpperCase();
  const planoDef = TABELA_PLANOS[planoKey];
  if (!planoDef) throw new Error(`Plano inválido: ${novoPlano}`);

  const sub = await obterOuCriarAssinatura(usuarioId);
  const preco = ciclo === 'anual' ? planoDef.precoAnualMensalizado : planoDef.precoMensal;

  const atualizado = await prisma.assinatura.update({
    where: { id: sub.id },
    data: {
      plano: planoKey,
      cotaLimite: planoDef.cotaLimite,
      precoMensal: preco,
      ciclo
    }
  });

  return obterMetricasUsoAssinatura(usuarioId);
}

module.exports = {
  TABELA_PLANOS,
  obterOuCriarAssinatura,
  obterMetricasUsoAssinatura,
  atualizarPlanoAssinatura
};
