/**
 * Serviço Modo Volante & Financeiro — Vetaro (Fase 2)
 *
 * Responsabilidades:
 * - Limites de clínicas parceiras por plano (alavanca Solo -> Pro)
 * - Cálculo de valores de exame, repasses (quando tutor paga direto) e status financeiros
 * - Agregação mensal por clínica parceira (faturado, recebido, a receber, repasses pendentes)
 * - Geração de exportação CSV (UTF-8 com BOM para Excel PT-BR)
 * - Geração de Relatório de Cobrança em HTML/PDF A4 com chave Pix via compilador_pdf.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizarNumeroDecimal(valor, fallback = 0) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor >= 0 ? Number(valor.toFixed(2)) : fallback;
  }
  const str = String(valor).trim().replace(/[R$\s]/g, '');
  if (!str) return fallback;
  // Suporta "1.250,50" e "180.50"
  const normalizado = str.includes(',')
    ? str.replace(/\./g, '').replace(',', '.')
    : str;
  const num = Number(normalizado);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Number(num.toFixed(2));
}

function formatarMoedaBrl(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBr(valor) {
  if (!valor) return '-';
  if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor.trim())) {
    return valor.trim();
  }
  const dt = new Date(valor);
  if (isNaN(dt.getTime())) return String(valor);
  return dt.toLocaleDateString('pt-BR');
}

function obterLimiteClinicasPorPlano(plano = 'GRATUITO', role = 'veterinario') {
  if (String(role || '').toLowerCase() === 'admin') return null; // ilimitado
  const p = String(plano || 'GRATUITO').toUpperCase();
  if (p === 'PRO' || p === 'CLINICA' || p === 'ILIMITADO' || p === 'ADMIN') return null;
  if (p === 'SOLO') return 3;
  return 2; // GRATUITO / TRIAL
}

function podeExportarExtratoPdfOficial(plano = 'GRATUITO', role = 'veterinario') {
  if (String(role || '').toLowerCase() === 'admin') return true;
  const p = String(plano || 'GRATUITO').toUpperCase();
  return p === 'PRO' || p === 'CLINICA' || p === 'ILIMITADO' || p === 'ADMIN';
}

function resolverIntervaloMes(mesStr = '') {
  const limpo = String(mesStr || '').trim();
  let ano;
  let mesIdx; // 0-11
  const match = limpo.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    ano = parseInt(match[1], 10);
    mesIdx = Math.min(11, Math.max(0, parseInt(match[2], 10) - 1));
  } else {
    const agora = new Date();
    ano = agora.getFullYear();
    mesIdx = agora.getMonth();
  }
  const inicio = new Date(ano, mesIdx, 1, 0, 0, 0, 0);
  const fim = new Date(ano, mesIdx + 1, 0, 23, 59, 59, 999);
  const mesFormatado = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
  const nomeMes = inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const rotulo = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  return { inicio, fim, mes: mesFormatado, rotulo };
}

function calcularValoresFinanceirosExame({
  clinica = null,
  tipo = 'ultrassom',
  valorOverride = null,
  quemPagou = 'CLINICA',
  formaPagamento = null,
  statusPagamentoOverride = null
} = {}) {
  const valorPadraoClinica = clinica
    ? normalizarNumeroDecimal(
        tipo === 'cirurgia' ? clinica.valorPadraoCirurgia : clinica.valorPadraoUltrassom,
        0
      )
    : 0;

  const temValorExplicito = valorOverride !== null && valorOverride !== undefined && String(valorOverride).trim() !== '';
  const valorExame = temValorExplicito
    ? normalizarNumeroDecimal(valorOverride, valorPadraoClinica)
    : valorPadraoClinica;

  const quemNorm = String(quemPagou || 'CLINICA').toUpperCase() === 'TUTOR' ? 'TUTOR' : 'CLINICA';
  const percentualRepasse = clinica ? normalizarNumeroDecimal(clinica.percentualRepasse, 0) : 0;

  let valorRepasse = 0;
  let statusPagamento = 'PENDENTE';
  let statusRepasse = 'NAO_APLICAVEL';
  let pagoEm = null;

  if (quemNorm === 'TUTOR') {
    // Tutor pagou diretamente ao veterinário volante
    statusPagamento = statusPagamentoOverride && ['PAGO', 'PENDENTE', 'ISENTO'].includes(String(statusPagamentoOverride).toUpperCase())
      ? String(statusPagamentoOverride).toUpperCase()
      : 'PAGO';
    if (statusPagamento === 'PAGO') {
      pagoEm = new Date();
    }
    valorRepasse = Number(((valorExame * percentualRepasse) / 100).toFixed(2));
    statusRepasse = valorRepasse > 0 ? 'PENDENTE' : 'NAO_APLICAVEL';
  } else {
    // Clínica recebe do tutor e paga o volante no fechamento
    statusPagamento = statusPagamentoOverride && ['PAGO', 'PENDENTE', 'ISENTO'].includes(String(statusPagamentoOverride).toUpperCase())
      ? String(statusPagamentoOverride).toUpperCase()
      : (valorExame > 0 ? 'PENDENTE' : 'ISENTO');
    if (statusPagamento === 'PAGO') {
      pagoEm = new Date();
    }
    valorRepasse = 0;
    statusRepasse = 'NAO_APLICAVEL';
  }

  return {
    valorExame: valorExame > 0 ? valorExame : null,
    quemPagou: quemNorm,
    valorRepasse: valorRepasse > 0 ? valorRepasse : null,
    statusPagamento,
    statusRepasse,
    formaPagamento: formaPagamento ? String(formaPagamento).trim().toUpperCase().slice(0, 30) : null,
    pagoEm
  };
}

function agregarResumoFinanceiro(exames = [], cirurgias = [], clinicas = []) {
  const mapaClinicas = new Map();
  clinicas.forEach((c) => {
    mapaClinicas.set(c.id, {
      clinicaId: c.id,
      nome: c.nome,
      whatsapp: c.whatsapp || '',
      nomeContato: c.nomeContato || '',
      diaFechamento: c.diaFechamento || null,
      qtdTotal: 0,
      qtdPendentes: 0,
      faturado: 0,
      recebido: 0,
      aReceber: 0,
      repassesPendentes: 0
    });
  });

  const normalizarItem = (reg, tipo) => {
    const valor = Number(reg.valorExame || 0);
    const repasse = Number(reg.valorRepasse || 0);
    const statusPag = String(reg.statusPagamento || 'PENDENTE').toUpperCase();
    const statusRep = String(reg.statusRepasse || 'NAO_APLICAVEL').toUpperCase();
    const quem = String(reg.quemPagou || 'CLINICA').toUpperCase();
    const clinicaObj = reg.clinicaParceira || (reg.clinicaParceiraId ? mapaClinicas.get(reg.clinicaParceiraId) : null);

    return {
      id: reg.id,
      tipo,
      pacienteNome: reg.pacienteNome || 'Paciente',
      pacienteEspecie: reg.pacienteEspecie || '',
      tutorNome: reg.tutorNome || '',
      procedimento: tipo === 'cirurgia' ? (reg.procedimento || 'Relatório Cirúrgico') : 'Ultrassonografia',
      dataExame: reg.dataExame || formatarDataBr(reg.criadoEm),
      criadoEm: reg.criadoEm,
      clinicaParceiraId: reg.clinicaParceiraId || null,
      clinicaNome: clinicaObj?.nome || 'Atendimento particular',
      clinicaWhatsapp: clinicaObj?.whatsapp || '',
      valorExame: valor,
      quemPagou: quem,
      valorRepasse: repasse,
      statusPagamento: statusPag,
      statusRepasse: statusRep,
      formaPagamento: reg.formaPagamento || null,
      pagoEm: reg.pagoEm || null,
      repassadoEm: reg.repassadoEm || null
    };
  };

  const lancamentos = [
    ...exames.map((e) => normalizarItem(e, 'ultrassom')),
    ...cirurgias.map((c) => normalizarItem(c, 'cirurgia'))
  ].sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());

  const totais = {
    totalExames: lancamentos.length,
    faturado: 0,
    recebido: 0,
    aReceber: 0,
    repassesPendentes: 0,
    repassesPagos: 0,
    liquidoEstimado: 0
  };

  for (const item of lancamentos) {
    if (item.statusPagamento !== 'ISENTO') {
      totais.faturado += item.valorExame;
      if (item.statusPagamento === 'PAGO') {
        totais.recebido += item.valorExame;
      } else if (item.statusPagamento === 'PENDENTE') {
        totais.aReceber += item.valorExame;
      }
    }

    if (item.valorRepasse > 0) {
      if (item.statusRepasse === 'PENDENTE') {
        totais.repassesPendentes += item.valorRepasse;
      } else if (item.statusRepasse === 'REPASSADO') {
        totais.repassesPagos += item.valorRepasse;
      }
    }

    if (item.clinicaParceiraId) {
      if (!mapaClinicas.has(item.clinicaParceiraId)) {
        mapaClinicas.set(item.clinicaParceiraId, {
          clinicaId: item.clinicaParceiraId,
          nome: item.clinicaNome,
          whatsapp: item.clinicaWhatsapp,
          nomeContato: '',
          diaFechamento: null,
          qtdTotal: 0,
          qtdPendentes: 0,
          faturado: 0,
          recebido: 0,
          aReceber: 0,
          repassesPendentes: 0
        });
      }
      const agg = mapaClinicas.get(item.clinicaParceiraId);
      agg.qtdTotal += 1;
      if (item.statusPagamento !== 'ISENTO') {
        agg.faturado += item.valorExame;
        if (item.statusPagamento === 'PAGO') {
          agg.recebido += item.valorExame;
        } else if (item.statusPagamento === 'PENDENTE') {
          agg.aReceber += item.valorExame;
          agg.qtdPendentes += 1;
        }
      }
      if (item.valorRepasse > 0 && item.statusRepasse === 'PENDENTE') {
        agg.repassesPendentes += item.valorRepasse;
      }
    }
  }

  totais.faturado = Number(totais.faturado.toFixed(2));
  totais.recebido = Number(totais.recebido.toFixed(2));
  totais.aReceber = Number(totais.aReceber.toFixed(2));
  totais.repassesPendentes = Number(totais.repassesPendentes.toFixed(2));
  totais.repassesPagos = Number(totais.repassesPagos.toFixed(2));
  totais.liquidoEstimado = Number((totais.faturado - totais.repassesPendentes - totais.repassesPagos).toFixed(2));

  const porClinica = Array.from(mapaClinicas.values())
    .map((c) => ({
      ...c,
      faturado: Number(c.faturado.toFixed(2)),
      recebido: Number(c.recebido.toFixed(2)),
      aReceber: Number(c.aReceber.toFixed(2)),
      repassesPendentes: Number(c.repassesPendentes.toFixed(2))
    }))
    .sort((a, b) => (b.aReceber - a.aReceber) || (b.repassesPendentes - a.repassesPendentes) || (b.faturado - a.faturado));

  return { totais, porClinica, lancamentos };
}

function escaparCelulaCsv(valor) {
  const str = String(valor ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[;"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function gerarCsvLancamentos(lancamentos = []) {
  const cabecalho = [
    'Data',
    'Tipo',
    'Paciente',
    'Espécie',
    'Tutor',
    'Clínica Parceira',
    'Procedimento',
    'Valor (R$)',
    'Quem Pagou',
    'Status Pagamento',
    'Repasse (R$)',
    'Status Repasse',
    'Forma Pagamento'
  ];

  const linhas = lancamentos.map((item) => [
    item.dataExame || formatarDataBr(item.criadoEm),
    item.tipo === 'cirurgia' ? 'Cirurgia' : 'Ultrassom',
    item.pacienteNome || '',
    item.pacienteEspecie || '',
    item.tutorNome || '',
    item.clinicaNome || 'Particular',
    item.procedimento || '',
    Number(item.valorExame || 0).toFixed(2).replace('.', ','),
    item.quemPagou === 'TUTOR' ? 'Tutor' : 'Clínica',
    item.statusPagamento || 'PENDENTE',
    Number(item.valorRepasse || 0).toFixed(2).replace('.', ','),
    item.statusRepasse || 'NAO_APLICAVEL',
    item.formaPagamento || ''
  ].map(escaparCelulaCsv).join(';'));

  return '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
}

function gerarHtmlExtratoCobranca({
  medico = {},
  clinica = {},
  periodoRotulo = '',
  itens = [],
  totais = {},
  preview = false
}) {
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const linhasHtml = itens.length > 0
    ? itens.map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escaparHtml(it.dataExame || formatarDataBr(it.criadoEm))}</td>
          <td><strong>${escaparHtml(it.pacienteNome)}</strong>${it.tutorNome ? `<br><span class="sub">${escaparHtml(it.tutorNome)}</span>` : ''}</td>
          <td>${escaparHtml(it.tipo === 'cirurgia' ? (it.procedimento || 'Cirurgia') : 'Ultrassonografia')}</td>
          <td>${escaparHtml(it.statusPagamento)}</td>
          <td class="num">${escaparHtml(formatarMoedaBrl(it.valorExame))}</td>
        </tr>
      `).join('\n')
    : `<tr><td colspan="6" style="text-align:center; padding:18px; color:#64748b;">Nenhum exame pendente encontrado neste período.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Extrato de Cobrança — ${escaparHtml(clinica.nome || 'Clínica Parceira')}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    body {
      margin: 0;
      font-family: Calibri, Arial, Helvetica, sans-serif;
      color: #0F172A;
      font-size: 10pt;
      line-height: 1.4;
      background: #FFFFFF;
    }
    .watermark {
      position: fixed;
      top: 44%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 42pt;
      font-weight: 800;
      color: rgba(15, 23, 42, 0.06);
      letter-spacing: 3px;
      pointer-events: none;
      white-space: nowrap;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0D5C56;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0 0 3px 0;
      font-size: 16pt;
      color: #0D5C56;
    }
    .header p {
      margin: 0;
      font-size: 9pt;
      color: #475569;
    }
    .badge-periodo {
      background: #E6FBF4;
      color: #065F46;
      border: 1px solid #A7F3D0;
      padding: 5px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 9pt;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .info-col h2 {
      margin: 0 0 4px 0;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
    }
    .info-col p {
      margin: 1px 0;
      font-size: 9.5pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    thead th {
      background: #0A141D;
      color: #FFFFFF;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      text-align: left;
      padding: 8px 8px;
    }
    thead th.num, tbody td.num {
      text-align: right;
      white-space: nowrap;
    }
    tbody td {
      padding: 7px 8px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 9.2pt;
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: #F8FAFC;
    }
    .sub {
      font-size: 8pt;
      color: #64748B;
    }
    .totals-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 18px;
    }
    .totals-inner {
      min-width: 240px;
      border: 1.5px solid #0D5C56;
      border-radius: 8px;
      padding: 10px 14px;
      background: #F0FDF9;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }
    .totals-row.final {
      border-top: 1px solid #99F6E4;
      padding-top: 6px;
      margin-top: 6px;
      margin-bottom: 0;
      font-size: 12pt;
      font-weight: 800;
      color: #065F46;
    }
    .pix-box {
      border: 1px dashed #0D5C56;
      background: #FFFFFF;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #CBD5E1;
      text-align: center;
      font-size: 8pt;
      color: #64748B;
    }
  </style>
</head>
<body>
  ${preview ? '<div class="watermark">PRÉVIA — PLANO PRO</div>' : ''}

  <div class="header">
    <div>
      <h1>Relatório de Cobrança de Exames</h1>
      <p>${escaparHtml(medico.nome || 'Médico(a) Veterinário(a)')}${medico.crmv ? ` • ${escaparHtml(medico.crmv)}` : ''}</p>
      ${medico.nomeClinica ? `<p>${escaparHtml(medico.nomeClinica)}</p>` : ''}
    </div>
    <div class="badge-periodo">${escaparHtml(periodoRotulo || 'Fechamento')}</div>
  </div>

  <div class="info-grid">
    <div class="info-col">
      <h2>Clínica Parceira</h2>
      <p><strong>${escaparHtml(clinica.nome || 'Clínica')}</strong></p>
      ${clinica.nomeContato ? `<p>Contato: ${escaparHtml(clinica.nomeContato)}</p>` : ''}
      ${clinica.cnpj ? `<p>CNPJ: ${escaparHtml(clinica.cnpj)}</p>` : ''}
      ${clinica.cidade ? `<p>${escaparHtml(clinica.cidade)}</p>` : ''}
    </div>
    <div class="info-col" style="text-align:right;">
      <h2>Dados do Extrato</h2>
      <p>Emitido em: <strong>${escaparHtml(dataEmissao)}</strong></p>
      <p>Exames listados: <strong>${itens.length}</strong></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28px;">#</th>
        <th style="width:78px;">Data</th>
        <th>Paciente / Tutor</th>
        <th>Exame / Procedimento</th>
        <th style="width:82px;">Status</th>
        <th class="num" style="width:92px;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${linhasHtml}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="totals-inner">
      <div class="totals-row">
        <span>Total de exames pendentes:</span>
        <strong>${escaparHtml(formatarMoedaBrl(totais.aReceber || 0))}</strong>
      </div>
      ${Number(totais.repassesPendentes || 0) > 0 ? `
      <div class="totals-row">
        <span>(-) Repasses pendentes à clínica:</span>
        <strong>- ${escaparHtml(formatarMoedaBrl(totais.repassesPendentes))}</strong>
      </div>
      ` : ''}
      <div class="totals-row final">
        <span>Saldo líquido a receber:</span>
        <span>${escaparHtml(formatarMoedaBrl(Math.max(0, Number(totais.aReceber || 0) - Number(totais.repassesPendentes || 0))))}</span>
      </div>
    </div>
  </div>

  ${medico.chavePix ? `
  <div class="pix-box">
    <strong>Dados para pagamento via Pix:</strong> ${escaparHtml(medico.chavePix)}
  </div>
  ` : ''}

  <div class="footer">
    Documento gerado automaticamente pelo Vetaro • Controle Financeiro para Imaginologistas Volantes
  </div>
</body>
</html>`;
}

async function gerarPdfExtratoCobranca(params = {}) {
  const { compilarPDF } = require('./compilador_pdf');
  const html = gerarHtmlExtratoCobranca(params);
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpHtml = path.join(os.tmpdir(), `extrato_volante_${stamp}.html`);
  const tmpPdf = path.join(os.tmpdir(), `extrato_volante_${stamp}.pdf`);

  fs.writeFileSync(tmpHtml, html, 'utf8');
  try {
    await compilarPDF(tmpHtml, tmpPdf);
    const buffer = fs.readFileSync(tmpPdf);
    return buffer;
  } finally {
    try { if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml); } catch (_) {}
    try { if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf); } catch (_) {}
  }
}

module.exports = {
  escaparHtml,
  normalizarNumeroDecimal,
  formatarMoedaBrl,
  formatarDataBr,
  obterLimiteClinicasPorPlano,
  podeExportarExtratoPdfOficial,
  resolverIntervaloMes,
  calcularValoresFinanceirosExame,
  agregarResumoFinanceiro,
  gerarCsvLancamentos,
  gerarHtmlExtratoCobranca,
  gerarPdfExtratoCobranca
};
