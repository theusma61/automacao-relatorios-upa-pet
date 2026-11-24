const {
  normalizarNumeroDecimal,
  obterLimiteClinicasPorPlano,
  podeExportarExtratoPdfOficial,
  resolverIntervaloMes,
  calcularValoresFinanceirosExame,
  agregarResumoFinanceiro,
  gerarCsvLancamentos,
  gerarHtmlExtratoCobranca
} = require('../servico_volante');

describe('Fase 2 — Modo Volante e Financeiro (servico_volante)', () => {
  test('normalizarNumeroDecimal aceita formato PT-BR e formato americano', () => {
    expect(normalizarNumeroDecimal('180,50')).toBe(180.5);
    expect(normalizarNumeroDecimal('R$ 1.250,75')).toBe(1250.75);
    expect(normalizarNumeroDecimal('200.00')).toBe(200);
    expect(normalizarNumeroDecimal('-10', 0)).toBe(0);
    expect(normalizarNumeroDecimal('', 99)).toBe(99);
  });

  test('obterLimiteClinicasPorPlano e podeExportarExtratoPdfOficial aplicam regras por plano', () => {
    expect(obterLimiteClinicasPorPlano('GRATUITO', 'veterinario')).toBe(2);
    expect(obterLimiteClinicasPorPlano('SOLO', 'veterinario')).toBe(3);
    expect(obterLimiteClinicasPorPlano('PRO', 'veterinario')).toBeNull();
    expect(obterLimiteClinicasPorPlano('CLINICA', 'veterinario')).toBeNull();
    expect(obterLimiteClinicasPorPlano('SOLO', 'admin')).toBeNull();

    expect(podeExportarExtratoPdfOficial('SOLO', 'veterinario')).toBe(false);
    expect(podeExportarExtratoPdfOficial('PRO', 'veterinario')).toBe(true);
    expect(podeExportarExtratoPdfOficial('SOLO', 'admin')).toBe(true);
  });

  test('calcularValoresFinanceirosExame calcula cobrança da clínica e repasse quando tutor paga direto', () => {
    const clinica = {
      valorPadraoUltrassom: 180,
      valorPadraoCirurgia: 450,
      percentualRepasse: 20
    };

    const cobrancaClinica = calcularValoresFinanceirosExame({
      clinica,
      tipo: 'ultrassom',
      quemPagou: 'CLINICA'
    });
    expect(cobrancaClinica.valorExame).toBe(180);
    expect(cobrancaClinica.statusPagamento).toBe('PENDENTE');
    expect(cobrancaClinica.valorRepasse).toBeNull();
    expect(cobrancaClinica.statusRepasse).toBe('NAO_APLICAVEL');

    const pagoPeloTutor = calcularValoresFinanceirosExame({
      clinica,
      tipo: 'ultrassom',
      quemPagou: 'TUTOR'
    });
    expect(pagoPeloTutor.valorExame).toBe(180);
    expect(pagoPeloTutor.statusPagamento).toBe('PAGO');
    expect(pagoPeloTutor.valorRepasse).toBe(36);
    expect(pagoPeloTutor.statusRepasse).toBe('PENDENTE');
    expect(pagoPeloTutor.pagoEm).toBeInstanceOf(Date);
  });

  test('agregarResumoFinanceiro consolida faturado, recebido, a receber e repasses por clínica', () => {
    const clinicas = [
      { id: 'c1', nome: 'Pet Center', whatsapp: '31999990001' },
      { id: 'c2', nome: 'Vet Vida', whatsapp: '31999990002' }
    ];
    const exames = [
      {
        id: 'e1',
        pacienteNome: 'Thor',
        clinicaParceiraId: 'c1',
        valorExame: 200,
        quemPagou: 'CLINICA',
        statusPagamento: 'PENDENTE',
        statusRepasse: 'NAO_APLICAVEL',
        criadoEm: '2026-11-10T10:00:00Z'
      },
      {
        id: 'e2',
        pacienteNome: 'Luna',
        clinicaParceiraId: 'c1',
        valorExame: 200,
        quemPagou: 'TUTOR',
        valorRepasse: 40,
        statusPagamento: 'PAGO',
        statusRepasse: 'PENDENTE',
        criadoEm: '2026-11-12T10:00:00Z'
      }
    ];
    const cirurgias = [
      {
        id: 's1',
        pacienteNome: 'Mel',
        procedimento: 'OSH',
        clinicaParceiraId: 'c2',
        valorExame: 500,
        quemPagou: 'CLINICA',
        statusPagamento: 'PAGO',
        statusRepasse: 'NAO_APLICAVEL',
        criadoEm: '2026-11-15T10:00:00Z'
      }
    ];

    const res = agregarResumoFinanceiro(exames, cirurgias, clinicas);
    expect(res.totais.totalExames).toBe(3);
    expect(res.totais.faturado).toBe(900);
    expect(res.totais.recebido).toBe(700);
    expect(res.totais.aReceber).toBe(200);
    expect(res.totais.repassesPendentes).toBe(40);
    expect(res.totais.liquidoEstimado).toBe(860);
    expect(res.porClinica[0].clinicaId).toBe('c1');
    expect(res.porClinica[0].aReceber).toBe(200);
    expect(res.porClinica[0].repassesPendentes).toBe(40);
  });

  test('gerarCsvLancamentos inclui BOM UTF-8 e vírgula decimal PT-BR', () => {
    const csv = gerarCsvLancamentos([
      {
        dataExame: '23/11/2026',
        tipo: 'ultrassom',
        pacienteNome: 'Rex',
        clinicaNome: 'Clínica A',
        valorExame: 185.5,
        quemPagou: 'CLINICA',
        statusPagamento: 'PENDENTE',
        valorRepasse: 0,
        statusRepasse: 'NAO_APLICAVEL'
      }
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('185,50');
    expect(csv).toContain('Clínica A');
  });

  test('gerarHtmlExtratoCobranca escapa XSS, exibe Pix e marca prévia quando aplicável', () => {
    const html = gerarHtmlExtratoCobranca({
      medico: { nome: 'Dra. Camila', crmv: 'CRMV-MG 123', chavePix: 'camila@vet.com' },
      clinica: { nome: 'Clínica <script>alert(1)</script>' },
      periodoRotulo: 'Novembro de 2026',
      itens: [{ dataExame: '20/11/2026', pacienteNome: 'Thor', tipo: 'ultrassom', statusPagamento: 'PENDENTE', valorExame: 200 }],
      totais: { aReceber: 200, repassesPendentes: 40 },
      preview: true
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('camila@vet.com');
    expect(html).toContain('PRÉVIA — PLANO PRO');
    expect(html).toContain('Novembro de 2026');
  });

  test('resolverIntervaloMes interpreta YYYY-MM corretamente', () => {
    const r = resolverIntervaloMes('2026-11');
    expect(r.mes).toBe('2026-11');
    expect(r.inicio.getFullYear()).toBe(2026);
    expect(r.inicio.getMonth()).toBe(10);
    expect(r.fim.getDate()).toBe(30);
  });
});
