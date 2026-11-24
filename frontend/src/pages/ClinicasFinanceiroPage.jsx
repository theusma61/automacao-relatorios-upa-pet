import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  MessageCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowUpRight,
  KeyRound,
  Save,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import ClinicaParceiraModal from '../components/modals/ClinicaParceiraModal';

function formatarMoeda(val) {
  return Number(val || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function obterMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function deslocarMes(mesStr, delta) {
  const [anoStr, mesNumStr] = String(mesStr || obterMesAtual()).split('-');
  const d = new Date(parseInt(anoStr, 10), parseInt(mesNumStr, 10) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizarWhatsApp(raw = '') {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

export default function ClinicasFinanceiroPage({
  darkMode = true,
  userProfile,
  setUserProfile,
  onOpenAssinatura,
  onToast
}) {
  const [subTab, setSubTab] = useState('resumo'); // 'resumo' | 'lancamentos' | 'clinicas'
  const [mes, setMes] = useState(obterMesAtual);
  const [filtroClinicaId, setFiltroClinicaId] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [clinicas, setClinicas] = useState([]);
  const [metaPlano, setMetaPlano] = useState({ limiteClinicas: null, ativasCount: 0, podeExportarPdfOficial: true });
  const [resumo, setResumo] = useState({ periodoRotulo: '', totais: {}, porClinica: [] });
  const [lancamentos, setLancamentos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [clinicaEditando, setClinicaEditando] = useState(null);
  const [quitandoId, setQuitandoId] = useState('');

  const [chavePix, setChavePix] = useState(userProfile?.chavePix || '');
  const [salvandoPix, setSalvandoPix] = useState(false);

  useEffect(() => {
    setChavePix(userProfile?.chavePix || '');
  }, [userProfile?.chavePix]);

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    try {
      const [resClinicas, resResumo, resLanc] = await Promise.all([
        api.listarClinicasParceiras(),
        api.getResumoFinanceiro(mes),
        api.getLancamentosFinanceiros({
          mes,
          clinicaId: filtroClinicaId,
          statusPagamento: filtroStatus
        })
      ]);

      setClinicas(resClinicas?.clinicas || []);
      setMetaPlano({
        plano: resClinicas?.plano || 'GRATUITO',
        limiteClinicas: resClinicas?.limiteClinicas ?? null,
        ativasCount: resClinicas?.ativasCount || 0,
        podeExportarPdfOficial: resClinicas?.podeExportarPdfOficial !== false
      });
      setResumo({
        periodoRotulo: resResumo?.periodoRotulo || mes,
        totais: resResumo?.totais || {},
        porClinica: resResumo?.porClinica || []
      });
      setLancamentos(resLanc?.lancamentos || []);
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao carregar painel financeiro.');
    } finally {
      setLoading(false);
    }
  }, [mes, filtroClinicaId, filtroStatus, onToast]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const handleSalvarChavePix = async () => {
    setSalvandoPix(true);
    try {
      const fd = new FormData();
      fd.append('chavePix', chavePix.trim());
      const res = await api.atualizarPerfilProfissional(fd);
      if (setUserProfile && res?.usuario) {
        setUserProfile((prev) => ({ ...prev, chavePix: res.usuario.chavePix }));
      }
      if (onToast) onToast('Chave Pix salva! Ela aparecerá nos extratos de cobrança.');
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao salvar chave Pix.');
    } finally {
      setSalvandoPix(false);
    }
  };

  const handleQuitarPendentes = async (clinicaItem) => {
    if (!clinicaItem?.clinicaId || quitandoId) return;
    setQuitandoId(clinicaItem.clinicaId);
    try {
      const res = await api.quitarPendentesClinica(clinicaItem.clinicaId, { mes, formaPagamento: 'PIX' });
      if (onToast) onToast(`${res.quitados || 0} exame(s) da clínica ${clinicaItem.nome} marcados como pagos!`);
      carregarTudo();
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao quitar pendências.');
    } finally {
      setQuitandoId('');
    }
  };

  const handleCobrarWhatsApp = (clinicaItem) => {
    const phone = normalizarWhatsApp(clinicaItem.whatsapp);
    const liquido = Math.max(0, Number(clinicaItem.aReceber || 0) - Number(clinicaItem.repassesPendentes || 0));
    const msg = [
      `Olá${clinicaItem.nomeContato ? `, ${clinicaItem.nomeContato}` : ''}! Tudo bem?`,
      `Segue o fechamento de exames realizados na ${clinicaItem.nome} referente a ${resumo.periodoRotulo}:`,
      `• Exames pendentes: ${clinicaItem.qtdPendentes} (${formatarMoeda(clinicaItem.aReceber)})`,
      Number(clinicaItem.repassesPendentes || 0) > 0
        ? `• (-) Repasses à clínica: ${formatarMoeda(clinicaItem.repassesPendentes)}`
        : '',
      `• Total líquido: ${formatarMoeda(liquido)}`,
      chavePix.trim() ? `\nChave Pix para pagamento: ${chavePix.trim()}` : ''
    ].filter(Boolean).join('\n');

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAlternarStatusPagamento = async (item) => {
    const proximo = item.statusPagamento === 'PAGO' ? 'PENDENTE' : 'PAGO';
    try {
      await api.atualizarLancamentoFinanceiro(item.tipo, item.id, { statusPagamento: proximo });
      if (onToast) onToast(`Status alterado para ${proximo}.`);
      carregarTudo();
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao atualizar lançamento.');
    }
  };

  const handleAlternarStatusRepasse = async (item) => {
    const proximo = item.statusRepasse === 'REPASSADO' ? 'PENDENTE' : 'REPASSADO';
    try {
      await api.atualizarLancamentoFinanceiro(item.tipo, item.id, { statusRepasse: proximo });
      if (onToast) onToast(`Repasse marcado como ${proximo}.`);
      carregarTudo();
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao atualizar repasse.');
    }
  };

  const handleDesativarClinica = async (c) => {
    try {
      await api.desativarClinicaParceira(c.id);
      if (onToast) onToast(`Clínica "${c.nome}" desativada.`);
      carregarTudo();
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao desativar clínica.');
    }
  };

  const t = resumo.totais || {};
  const limiteAtingido =
    metaPlano.limiteClinicas !== null && metaPlano.ativasCount >= metaPlano.limiteClinicas;

  return (
    <div className="space-y-6">
      {/* Header + Seletor de Mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-[#00D296]" />
            <span>Modo Volante &amp; Financeiro</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gerencie clínicas parceiras, saiba quanto cada uma te deve e feche o mês sem planilhas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center rounded-xl border px-1 py-1 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setMes((m) => deslocarMes(m, -1))}
              className="p-1.5 rounded-lg hover:bg-white/5"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold min-w-[130px] text-center">
              {resumo.periodoRotulo || mes}
            </span>
            <button
              type="button"
              onClick={() => setMes((m) => deslocarMes(m, 1))}
              className="p-1.5 rounded-lg hover:bg-white/5"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setClinicaEditando(null);
              setModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] hover:brightness-110 transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Clínica</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Faturado no mês', val: formatarMoeda(t.faturado), sub: `${t.totalExames || 0} exame(s)`, accent: 'text-[#00D296]' },
          { label: 'Recebido', val: formatarMoeda(t.recebido), sub: 'Quitado no período', accent: 'text-emerald-400' },
          { label: 'A receber (clínicas)', val: formatarMoeda(t.aReceber), sub: 'Pendente de pagamento', accent: 'text-amber-400' },
          { label: 'Repasses pendentes', val: formatarMoeda(t.repassesPendentes), sub: `Líquido: ${formatarMoeda(t.liquidoEstimado)}`, accent: 'text-sky-400' }
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border p-4 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <p className="text-[11px] font-bold text-slate-400">{kpi.label}</p>
            <p className={`text-lg sm:text-2xl font-extrabold mt-1 ${kpi.accent}`}>{kpi.val}</p>
            <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Sub-abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'resumo', label: 'Cobrança por Clínica' },
            { id: 'lancamentos', label: `Lançamentos (${lancamentos.length})` },
            { id: 'clinicas', label: `Clínicas Parceiras (${clinicas.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                subTab === tab.id
                  ? 'bg-[#00D296] text-[#052925]'
                  : darkMode
                  ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={carregarTudo}
          className={`p-2 rounded-xl border text-xs ${
            darkMode ? 'border-slate-800 bg-[#0F1C26] text-slate-400 hover:text-white' : 'border-slate-200 bg-white text-slate-500'
          }`}
          title="Atualizar dados"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-[#00D296]" />
          <span>Carregando dados financeiros...</span>
        </div>
      ) : (
        <>
          {/* ABA 1: COBRANÇA POR CLÍNICA */}
          {subTab === 'resumo' && (
            <div className="space-y-4">
              {/* Chave Pix rápida */}
              <div
                className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-[#00D296] shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold">Sua Chave Pix para Extratos e Cobrança</p>
                    <p className="text-[11px] text-slate-400">
                      Sai automaticamente no PDF de cobrança e nas mensagens de WhatsApp.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="CPF, CNPJ, e-mail ou telefone"
                    className={`flex-1 sm:w-64 px-3 py-2 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-[#0A141D] border-slate-700 text-slate-100' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={salvandoPix}
                    onClick={handleSalvarChavePix}
                    className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#0D5C56] text-white hover:brightness-110 inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{salvandoPix ? '...' : 'Salvar'}</span>
                  </button>
                </div>
              </div>

              {resumo.porClinica.length === 0 ? (
                <div
                  className={`rounded-2xl border p-8 text-center space-y-3 ${
                    darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <Building2 className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-sm font-bold">Nenhuma clínica parceira cadastrada ainda</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Cadastre as clínicas onde você atende para vincular exames automaticamente, emitir extratos em PDF e cobrar pelo WhatsApp em 1 clique.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumo.porClinica.map((c) => (
                    <div
                      key={c.clinicaId}
                      className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold">{c.nome}</h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {c.qtdTotal} exame(s) no mês
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <span className="text-slate-400">
                            Faturado: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{formatarMoeda(c.faturado)}</strong>
                          </span>
                          <span className="text-amber-400">
                            A receber: <strong>{formatarMoeda(c.aReceber)}</strong> ({c.qtdPendentes} pend.)
                          </span>
                          {c.repassesPendentes > 0 && (
                            <span className="text-sky-400">
                              Repasse pendente: <strong>{formatarMoeda(c.repassesPendentes)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={api.getUrlExtratoPdfClinica(c.clinicaId, mes)}
                          target="_blank"
                          rel="noreferrer"
                          className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                            darkMode
                              ? 'border-slate-700 bg-[#0A141D] text-slate-200 hover:border-[#00D296]'
                              : 'border-slate-300 bg-slate-50 text-slate-800'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5 text-[#00D296]" />
                          <span>Extrato PDF</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCobrarWhatsApp(c)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                            darkMode
                              ? 'border-[#00D296]/40 bg-[#00D296]/10 text-[#00D296] hover:bg-[#00D296]/20'
                              : 'border-teal-300 bg-teal-50 text-[#0D5C56]'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Cobrar WhatsApp</span>
                        </button>

                        {c.qtdPendentes > 0 && (
                          <button
                            type="button"
                            disabled={quitandoId === c.clinicaId}
                            onClick={() => handleQuitarPendentes(c)}
                            className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] hover:brightness-110 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{quitandoId === c.clinicaId ? 'Quitando...' : 'Quitar pendentes'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: LANÇAMENTOS */}
          {subTab === 'lancamentos' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filtroClinicaId}
                    onChange={(e) => setFiltroClinicaId(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                      darkMode ? 'bg-[#0F1C26] border-slate-700 text-slate-100' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="">Todas as clínicas</option>
                    <option value="particular">Atendimento particular</option>
                    {clinicas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>

                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                      darkMode ? 'bg-[#0F1C26] border-slate-700 text-slate-100' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="">Todos os status</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGO">Pago</option>
                    <option value="ISENTO">Isento / Sem valor</option>
                  </select>
                </div>

                <a
                  href={api.getUrlExportarCsvFinanceiro({ mes, clinicaId: filtroClinicaId, statusPagamento: filtroStatus })}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-slate-700 bg-[#0F1C26] text-slate-200 hover:border-[#00D296]'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#00D296]" />
                  <span>Exportar CSV (Excel)</span>
                </a>
              </div>

              <div
                className={`rounded-2xl border divide-y overflow-hidden ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200 divide-slate-100'
                }`}
              >
                {lancamentos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </div>
                ) : (
                  lancamentos.map((item) => (
                    <div
                      key={`${item.tipo}-${item.id}`}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate">
                          {item.pacienteNome}{' '}
                          <span className="font-normal text-slate-400">
                            • {item.tipo === 'cirurgia' ? item.procedimento : 'Ultrassom'} • {item.clinicaNome}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.dataExame} • {item.quemPagou === 'TUTOR' ? 'Pago pelo tutor' : 'Cobrança da clínica'}
                          {item.valorRepasse > 0 ? ` • Repasse: ${formatarMoeda(item.valorRepasse)}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold">
                          {formatarMoeda(item.valorExame)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAlternarStatusPagamento(item)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition ${
                            item.statusPagamento === 'PAGO'
                              ? 'bg-[#00D296]/15 text-[#00D296]'
                              : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                          }`}
                        >
                          {item.statusPagamento === 'PAGO' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{item.statusPagamento}</span>
                        </button>

                        {item.valorRepasse > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAlternarStatusRepasse(item)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              item.statusRepasse === 'REPASSADO'
                                ? 'bg-sky-500/15 text-sky-300'
                                : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                            }`}
                          >
                            {item.statusRepasse === 'REPASSADO' ? 'Repassado' : 'Repassar'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 3: CLÍNICAS PARCEIRAS */}
          {subTab === 'clinicas' && (
            <div className="space-y-4">
              {metaPlano.limiteClinicas !== null && (
                <div
                  className={`rounded-2xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${
                    limiteAtingido
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : darkMode
                      ? 'bg-[#0F1C26] border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold">
                    Você usa <strong>{metaPlano.ativasCount} de {metaPlano.limiteClinicas}</strong> clínicas parceiras no plano {metaPlano.plano}.
                  </span>
                  {onOpenAssinatura && (
                    <button
                      type="button"
                      onClick={onOpenAssinatura}
                      className="text-xs font-extrabold text-[#00D296] inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Liberar ilimitadas no Pro</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {clinicas.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold truncate">{c.nome}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.cidade || 'Sem cidade'} {c.whatsapp ? `• ${c.whatsapp}` : ''}
                        </p>
                      </div>
                      {c.usarIdentidadePropria && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00D296]/15 text-[#00D296] shrink-0">
                          Logo própria
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>USG: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{formatarMoeda(c.valorPadraoUltrassom)}</strong></span>
                      <span>Cirurgia: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{formatarMoeda(c.valorPadraoCirurgia)}</strong></span>
                      <span>Repasse: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{c.percentualRepasse || 0}%</strong></span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          setClinicaEditando(c);
                          setModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                          darkMode ? 'border-slate-700 bg-[#0A141D] text-slate-200 hover:border-[#00D296]' : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDesativarClinica(c)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Desativar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ClinicaParceiraModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        clinica={clinicaEditando}
        darkMode={darkMode}
        onSaved={() => carregarTudo()}
        onToast={onToast}
      />
    </div>
  );
}
