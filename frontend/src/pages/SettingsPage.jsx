import React, { useRef, useState, useEffect } from 'react';
import {
  FileUp,
  User,
  CreditCard,
  Settings,
  Stethoscope,
  Upload,
  ShieldCheck,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  PieChart,
  ArrowRight,
  X,
  Building2,
  Sparkles,
  FileText,
  Calendar,
  Zap
} from 'lucide-react';
import { UltrasoundIcon } from '../components/icons/VetaroIcons';
import EstiloLaudoTab from '../components/EstiloLaudoTab';
import { api } from '../services/api';

export default function SettingsPage({
  darkMode,
  setDarkMode,
  isMobileLayout = false,
  settingsTab,
  setSettingsTab,
  userProfile,
  setUserProfile,
  activitiesCount = 142,
  onOpenAdminModal,
  onToast
}) {
  const logoInputRef = useRef(null);
  const assinaturaInputRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [assinaturaFile, setAssinaturaFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [modalPlanoAberto, setModalPlanoAberto] = useState(false);
  const [trocandoPlano, setTrocandoPlano] = useState(false);
  const pdfCloneInputRef = useRef(null);
  const [cloningPdfs, setCloningPdfs] = useState(false);
  const [clonedSummary, setClonedSummary] = useState(null);

  const handleCloneFromPdfs = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length) return;

    setCloningPdfs(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('pdfs', f));
      const res = await api.importarPadraoPdfs(fd);
      if (res && res.perfilExtraido) {
        setClonedSummary(res.perfilExtraido);
        const idProf = res.perfilExtraido.identidadeProfissional || {};
        if (idProf.nomeMedico || idProf.crmv || idProf.nomeClinica) {
          setUserProfile({
            ...userProfile,
            name: idProf.nomeMedico || userProfile.name,
            crmv: idProf.crmv || userProfile.crmv,
            clinicName: idProf.nomeClinica || userProfile.clinicName
          });
        }
      }
      onToast(`Padrão visual (300 DPI) e estilo de escrita extraídos de ${files.length} PDF(s)!`);
    } catch (err) {
      onToast('Erro ao clonar PDFs: ' + err.message);
    } finally {
      setCloningPdfs(false);
    }
  };


  const carregarMetricasUso = async () => {
    setLoadingUsage(true);
    try {
      const res = await api.getUsoAssinatura();
      if (res && res.sucesso) {
        setUsageData(res);
      }
    } catch (err) {
      console.warn('Aviso ao carregar métricas:', err.message);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Carrega na montagem da tela e ao alternar para a aba de assinatura
  useEffect(() => {
    carregarMetricasUso();
  }, []);

  useEffect(() => {
    if (settingsTab === 'assinatura') {
      carregarMetricasUso();
    }
  }, [settingsTab]);

  const handleTrocarPlano = (novoPlano) => {
    const nomes = {
      SOLO: 'Solo / Volante (R$ 79/mês)',
      PRO: 'Especialista Pro (R$ 149/mês)',
      CLINICA: 'Clínica & Hospital 24h (R$ 297/mês)'
    };
    const planoEscolhido = nomes[novoPlano] || novoPlano;
    onToast(`Integração de pagamento em homologação (Pix e Cartão). Em breve você poderá assinar o plano ${planoEscolhido} diretamente pela plataforma!`);
    setModalPlanoAberto(false);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append('nome', userProfile.name || '');
      fd.append('crmv', userProfile.crmv || '');
      fd.append('nomeClinica', userProfile.clinicName || '');
      if (logoFile) fd.append('logo', logoFile);
      if (assinaturaFile) fd.append('assinatura', assinaturaFile);

      const res = await api.updatePerfilProfissional(fd);
      if (res && res.usuario) {
        setUserProfile({
          ...userProfile,
          ...res.usuario,
          name: res.usuario.nome || userProfile.name,
          clinicName: res.usuario.nomeClinica || userProfile.clinicName
        });
      }
      onToast(`Dados do perfil (${userProfile.name}) salvos com sucesso!`);
    } catch (_) {
      onToast(`Dados do perfil da ${userProfile.name} atualizados!`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navegação correspondente aos 3 itens do Menu de Perfil da 2ª Foto */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-700/40">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'perfil', label: `Meu perfil (${userProfile.greetingName})`, icon: User },
            { id: 'estilo', label: 'Estilo & Padrão de Laudo', icon: Sparkles },
            { id: 'assinatura', label: 'Plano e assinatura', icon: CreditCard },
            { id: 'preferencias', label: 'Configurações & IA', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = settingsTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSettingsTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                  active
                    ? 'bg-[#00D296] text-[#062E2B] shadow-sm'
                    : darkMode
                    ? 'bg-[#0F1C26] text-slate-300 hover:bg-slate-800'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {userProfile.role === 'admin' && onOpenAdminModal && (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="px-3.5 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Controle de Acessos (Admin)</span>
          </button>
        )}
      </div>

      {/* ABA 1: MEU PERFIL */}
      {settingsTab === 'perfil' && (
        <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
          {/* Cartão da Médica Veterinária */}
          <div
            className={`${
              isMobileLayout ? '' : 'col-span-4'
            } p-6 rounded-2xl border flex flex-col items-center text-center ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-[#637692] text-white flex items-center justify-center font-extrabold text-2xl mb-3 shadow-lg">
              {userProfile.initials}
            </div>
            <h3 className="text-lg font-extrabold">{userProfile.name}</h3>
            <p className="text-xs text-[#00D296] font-bold mt-0.5">{userProfile.crmv}</p>
            <p className="text-xs text-slate-400 mt-1">{userProfile.email}</p>

            <div
              className={`w-full mt-5 p-3.5 rounded-xl border text-left text-xs space-y-1.5 ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-extrabold text-[11px] uppercase tracking-wider text-[#00D296]">
                Carimbo Digital nos Laudos
              </p>
              <p className="font-bold">{userProfile.name}</p>
              <p>{userProfile.crmv} • Diagnóstico Veterinário</p>
              <p className="text-[11px] text-slate-400">
                Assinatura eletrônica ativa em todos os PDFs gerados.
              </p>
            </div>
          </div>

          {/* Formulário de Edição de Dados Profissionais */}
          <div
            className={`${
              isMobileLayout ? '' : 'col-span-8'
            } p-6 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#00D296]" />
              Dados Profissionais & Clínica Veterinária
            </h3>

            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Nome Completo no Laudo
                </label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, name: e.target.value, nome: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Registro CRMV / UF
                </label>
                <input
                  type="text"
                  value={userProfile.crmv}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, crmv: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  E-mail Profissional
                </label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, email: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Nome da Clínica / Serviço Volante
                </label>
                <input
                  type="text"
                  value={userProfile.clinicName}
                  onChange={(e) =>
                    setUserProfile({
                      ...userProfile,
                      clinicName: e.target.value,
                      nomeClinica: e.target.value
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-400">
                Especialidade exibida no rodapé dos laudos
              </label>
              <input
                type="text"
                value={userProfile.specialty}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, specialty: e.target.value })
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                }`}
              />
            </div>

            {/* Uploads Multi-Médico de Logotipo e Assinatura Digital */}
            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pt-1`}>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current && logoInputRef.current.click()}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-slate-300 hover:border-[#00D296]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0D5C56]'
                  }`}
                >
                  <Upload className="w-4 h-4 text-[#00D296]" />
                  <span className="truncate">
                    {logoFile ? logoFile.name : 'Enviar Logotipo da Clínica (PNG/JPG)'}
                  </span>
                </button>
              </div>

              <div>
                <input
                  ref={assinaturaInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => setAssinaturaFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() =>
                    assinaturaInputRef.current && assinaturaInputRef.current.click()
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-slate-300 hover:border-[#00D296]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0D5C56]'
                  }`}
                >
                  <Upload className="w-4 h-4 text-[#00D296]" />
                  <span className="truncate">
                    {assinaturaFile
                      ? assinaturaFile.name
                      : 'Enviar Assinatura / Carimbo (PNG/JPG)'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingProfile}
                onClick={handleSaveProfile}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA: ESTILO & PADRÃO DE LAUDO (APRENDIZADO POR IA) */}
      {settingsTab === 'estilo' && (
        <EstiloLaudoTab
          darkMode={darkMode}
          isMobileLayout={isMobileLayout}
          onToast={onToast}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />
      )}

      {/* ABA 2: PLANO, COTAS E CONTROLE DE GASTOS */}
      {settingsTab === 'assinatura' && (() => {
        if (loadingUsage && !usageData) {
          return (
            <div className={`p-12 text-center rounded-2xl border flex flex-col items-center justify-center gap-3 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 border-2 border-[#00D296] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-400">
                Carregando detalhes da assinatura e consumo de cotas...
              </p>
            </div>
          );
        }

        const isGratuito = (usageData?.plano?.chave || '').toUpperCase() === 'GRATUITO' || (usageData?.plano?.preco === 0);

        const p = usageData?.plano || {
          nome: 'Degustação Gratuita',
          chave: 'GRATUITO',
          preco: 0.0,
          ciclo: 'mensal',
          status: 'TRIAL',
          diasRestantes: 30,
          cicloFim: new Date(Date.now() + 30 * 86400000).toISOString(),
          cartaoBandeira: null,
          cartaoFinal: null,
          descricao: '10 laudos gratuitos para testar a ferramenta com IA + Cirurgias ilimitadas'
        };
        const c = usageData?.cota || {
          limite: 10,
          consumido: activitiesCount || 0,
          disponivel: Math.max(0, 10 - (activitiesCount || 0)),
          porcentagem: Math.min(100, Number((((activitiesCount || 0) / 10) * 100).toFixed(1)))
        };
        const b = usageData?.breakdown || {
          ultrassom: activitiesCount || 0,
          cirurgia: 0,
          totalDocumentos: activitiesCount || 0,
          excedenteQtd: 0,
          excedenteValor: 0
        };
        const m = usageData?.metricasValor || {
          horasEconomizadas: Number((((activitiesCount || 0) * 25) / 60).toFixed(1)),
          custoEfetivoUnitario: 0.0,
          faturamentoEstimado: (activitiesCount || 0) * 160
        };
        const historico = usageData?.historicoMeses || [];
        const maxHistoricoTotal = Math.max(1, ...historico.map((h) => h.total || 0));
        const faturas = usageData?.faturas || [];

        const progressColor =
          c.porcentagem > 90 ? 'bg-rose-500' : c.porcentagem > 75 ? 'bg-amber-400' : 'bg-[#00D296]';

        return (
          <div className="space-y-6">
            {/* 1. Header do Plano e Resumo de Cota */}
            <div
              className={`p-6 sm:p-7 rounded-2xl border transition ${
                darkMode
                  ? 'bg-gradient-to-br from-[#11232E] to-[#0A1A22] border-teal-500/30'
                  : 'bg-gradient-to-br from-[#E8F8F3] to-[#DDF5ED] border-[#C3EFE2]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-teal-500/20">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#00D296] text-[#062E2B] tracking-wide">
                      PLANO ATIVO: {p.nome.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      • {isGratuito ? 'Degustação (10 laudos cortesia)' : 'Renovação automática'}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {isGratuito ? (
                      <>
                        R$ 0,00
                        <span className="text-xs sm:text-sm font-semibold opacity-80">
                          {' '}
                          / 10 laudos gratuitos
                        </span>
                      </>
                    ) : (
                      <>
                        R$ {Number(p.preco).toFixed(2).replace('.', ',')}
                        <span className="text-xs sm:text-sm font-semibold opacity-80">
                          {' '}
                          / {p.ciclo === 'anual' ? 'mês (anual)' : 'mês'}
                        </span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00D296]" />
                    <span>
                      {isGratuito ? 'Período de teste válido por' : 'Renovação em'}{' '}
                      <strong>{p.diasRestantes} dias</strong> (
                      {new Date(p.cicloFim).toLocaleDateString('pt-BR')})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalPlanoAberto(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#0D5C56] text-white hover:bg-[#094742] dark:bg-[#00D296] dark:text-[#062E2B] dark:hover:bg-[#00e6a4] transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGratuito ? 'Fazer Upgrade de Plano' : 'Mudar de Plano'}</span>
                  </button>
                </div>
              </div>

              {/* Barra de Progresso de Cota Disponível */}
              <div className="pt-5 space-y-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold">
                      Quantidade disponível no mês:
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#00D296] leading-none mt-1">
                      {c.disponivel}{' '}
                      <span className="text-xs sm:text-sm font-bold text-slate-400">
                        laudos restantes
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium">
                      Consumido: <strong>{c.consumido}</strong> de {c.limite} laudos
                    </span>
                    <span className="text-xs font-extrabold ml-2 text-slate-300">
                      ({c.porcentagem}%)
                    </span>
                  </div>
                </div>

                {/* Trilho da Barra */}
                <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden p-0.5">
                  <div
                    style={{ width: `${Math.min(100, Math.max(2, c.porcentagem))}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  />
                </div>

                {c.porcentagem >= 80 && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Você já utilizou <strong>{c.porcentagem}%</strong> da sua cota mensal. Se
                      ultrapassar o limite, os laudos seguintes continuam sendo emitidos normalmente no
                      modelo avulso (R$ 1,50/laudo) ou você pode fazer upgrade para o plano superior.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Três Métricas Chave (KPIs Financeiros & Produtividade) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className={`p-5 rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">Tempo Economizado</span>
                  <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#00D296]">
                  ~{m.horasEconomizadas}h
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Tempo de digitação poupado neste ciclo (base ~25 min/exame).
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">Custo Médio / Laudo</span>
                  <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#00D296]">
                  R$ {Number(m.custoEfetivoUnitario).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Custo real de cada laudo emitido dentro da sua assinatura.
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">Faturamento Estimado</span>
                  <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#00D296]">
                  R$ {Number(m.faturamentoEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Receita gerada em exames (a Vetaro representa &lt; 1% do seu faturamento).
                </p>
              </div>
            </div>

            {/* 3. Painel de Uso nos Últimos Meses & Divisão de Gastos */}
            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
              {/* Gráfico de Barras: Evolução dos Últimos Meses */}
              <div
                className={`${
                  isMobileLayout ? '' : 'col-span-7'
                } p-6 rounded-2xl border space-y-4 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00D296]" />
                    <h4 className="text-sm font-extrabold">Uso nos Últimos Meses</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Total: {historico.reduce((acc, h) => acc + (h.total || 0), 0)} documentos
                  </span>
                </div>

                {/* Visualizador de Barras CSS */}
                <div className="pt-4 pb-2 flex items-end justify-between gap-3 h-44 border-b border-slate-200 dark:border-slate-800">
                  {historico.map((h, i) => {
                    const pct = Math.max(10, Math.round(((h.total || 0) / maxHistoricoTotal) * 100));
                    const isAtual = i === historico.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#00D296] transition">
                          {h.total}
                        </span>
                        <div className="w-full max-w-[34px] rounded-t-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:opacity-90" style={{ height: `${pct}%` }}>
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full rounded-t-lg transition-all ${
                              isAtual ? 'bg-[#00D296]' : 'bg-[#0D5C56]/70 dark:bg-[#00D296]/50'
                            }`}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold mt-1 ${isAtual ? 'text-[#00D296] font-bold' : 'text-slate-400'}`}>
                          {h.mes}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#00D296]" />
                    <span>Mês atual em andamento</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#0D5C56]/70 dark:bg-[#00D296]/50" />
                    <span>Meses anteriores</span>
                  </span>
                </div>
              </div>

              {/* Divisão dos Gastos (Breakdown por Serviço) */}
              <div
                className={`${
                  isMobileLayout ? '' : 'col-span-5'
                } p-6 rounded-2xl border space-y-4 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#00D296]" />
                  <h4 className="text-sm font-extrabold">Divisão dos Gastos no Ciclo</h4>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Item 1: Ultrassom */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                        <UltrasoundIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Ultrassonografia Abdominal</p>
                        <p className="text-[10px] text-slate-400">Consumo da cota contratada</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#00D296]">
                      {b.ultrassom} laudos
                    </span>
                  </div>

                  {/* Item 2: Cirurgia */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Relatórios Cirúrgicos</p>
                        <p className="text-[10px] text-slate-400">Ilimitados no seu plano</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#00D296]">
                      {b.cirurgia} fichas
                    </span>
                  </div>

                  {/* Item 3: Excedente */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Laudos Excedentes</p>
                        <p className="text-[10px] text-slate-400">R$ 1,50 / laudo adicional</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold">
                      {b.excedenteQtd} (R$ {Number(b.excedenteValor).toFixed(2).replace('.', ',')})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Método de Pagamento & Faturas Reais */}
            <div
              className={`p-6 rounded-2xl border space-y-4 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold">Método de Pagamento & Faturas</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cobranças processadas com segurança e notas fiscais automáticas.
                  </p>
                </div>
                {p.cartaoFinal ? (
                  <div className="p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A141D] flex items-center gap-3 text-xs">
                    <CreditCard className="w-4 h-4 text-[#00D296]" />
                    <span className="font-bold">
                      {p.cartaoBandeira || 'Cartão'} •••• {p.cartaoFinal}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold">
                      Padrão
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A141D] flex items-center gap-2.5 text-xs text-slate-400">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Nenhum cartão cadastrado ({isGratuito ? 'Plano Gratuito' : 'Sem cartão'})</span>
                  </div>
                )}
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs pt-2">
                {faturas.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    {isGratuito
                      ? 'Nenhuma fatura a pagar. Você está no plano Degustação Gratuita (10 laudos de cortesia).'
                      : 'Nenhuma fatura registrada no período.'}
                  </div>
                ) : (
                  faturas.map((fat) => (
                    <div key={fat.id} className="py-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">
                          {new Date(fat.data).toLocaleDateString('pt-BR')} — {fat.descricao || `Vetaro ${p.nome}`}
                        </p>
                        <p className="text-[10px] text-slate-400">Comprovante de pagamento emitido</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-[#00D296]">
                          R$ {Number(fat.valor).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00D296]/15 text-[#00D296]">
                          {fat.status === 'pago' ? 'Pago' : fat.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal de Troca de Plano */}
            {modalPlanoAberto && (
              <div
                onClick={() => setModalPlanoAberto(false)}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-2xl rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl relative ${
                    darkMode
                      ? 'bg-[#0F1C26] border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-[#0A141D]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setModalPlanoAberto(false)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div>
                    <h3 className="text-xl font-extrabold">Alterar Plano da Assinatura</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Escolha a franquia mensal que melhor se adequa ao seu volume atual de exames:
                    </p>
                    <div className="mt-3 p-3 rounded-xl bg-[#00D296]/10 border border-[#00D296]/30 text-xs text-[#00D296] flex items-center gap-2 font-medium">
                      <Sparkles className="w-4 h-4 shrink-0 text-[#00D296]" />
                      <span>O módulo de checkout e pagamento seguro (Pix e Cartão) está em fase final de homologação.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Solo */}
                    <div
                      className={`p-5 rounded-2xl border flex flex-col justify-between ${
                        p.chave === 'SOLO'
                          ? 'border-[#00D296] bg-[#00D296]/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-extrabold">Solo / Volante</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Até 40 laudos/mês</p>
                        <p className="text-xl font-extrabold mt-3">R$ 79<span className="text-xs font-normal">/mês</span></p>
                      </div>
                      <button
                        type="button"
                        disabled={trocandoPlano || p.chave === 'SOLO'}
                        onClick={() => handleTrocarPlano('SOLO')}
                        className="mt-4 w-full py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-[#00D296] transition"
                      >
                        {p.chave === 'SOLO' ? 'Plano Atual' : 'Escolher Solo'}
                      </button>
                    </div>

                    {/* Pro */}
                    <div
                      className={`p-5 rounded-2xl border flex flex-col justify-between relative ${
                        p.chave === 'PRO'
                          ? 'border-[#00D296] bg-[#00D296]/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00D296] text-[#062E2B] text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                        MAIS POPULAR
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold">Especialista Pro</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Até 150 laudos/mês</p>
                        <p className="text-xl font-extrabold mt-3">R$ 149<span className="text-xs font-normal">/mês</span></p>
                      </div>
                      <button
                        type="button"
                        disabled={trocandoPlano || p.chave === 'PRO'}
                        onClick={() => handleTrocarPlano('PRO')}
                        className="mt-4 w-full py-2 rounded-xl text-xs font-bold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition"
                      >
                        {p.chave === 'PRO' ? 'Plano Atual' : 'Escolher Pro'}
                      </button>
                    </div>

                    {/* Clinica */}
                    <div
                      className={`p-5 rounded-2xl border flex flex-col justify-between ${
                        p.chave === 'CLINICA'
                          ? 'border-[#00D296] bg-[#00D296]/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-extrabold">Clínica & Hospital</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Até 500 laudos/mês</p>
                        <p className="text-xl font-extrabold mt-3">R$ 297<span className="text-xs font-normal">/mês</span></p>
                      </div>
                      <button
                        type="button"
                        disabled={trocandoPlano || p.chave === 'CLINICA'}
                        onClick={() => handleTrocarPlano('CLINICA')}
                        className="mt-4 w-full py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-[#00D296] transition"
                      >
                        {p.chave === 'CLINICA' ? 'Plano Atual' : 'Escolher Clínica'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ABA 3: CONFIGURAÇÕES DO SISTEMA & IA */}
      {settingsTab === 'preferencias' && (
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-base font-extrabold">
            Preferências de Geração de Laudos com IA & Aparência
          </h3>

          <div className="space-y-3">
            {[
              {
                key: 'autoMeasurements',
                title: 'Sugestão Automática de Impressão Diagnóstica',
                desc: 'A IA Vetaro sugere hipóteses diagnósticas ao final do laudo de ultrassom.'
              },
              {
                key: 'voiceDictation',
                title: 'Transcrição de Voz Veterinária em Tempo Real',
                desc: 'Permite ditar medidas de órgãos durante o exame ultrassonográfico.'
              },
              {
                key: 'includeHeaderLogo',
                title: 'Incluir Papel Timbrado e Carimbo CRMV no PDF',
                desc: 'Exporta os laudos prontos para envio via WhatsApp ou impressão.'
              }
            ].map((item) => (
              <div
                key={item.key}
                onClick={() =>
                  setUserProfile({
                    ...userProfile,
                    [item.key]: !userProfile[item.key]
                  })
                }
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs sm:text-sm font-extrabold">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    userProfile[item.key] ? 'bg-[#00D296]' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full bg-white shadow transform transition-transform"
                    style={{
                      transform: userProfile[item.key]
                        ? 'translateX(22px)'
                        : 'translateX(2px)'
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Alternador de Modo Claro / Escuro sincronizado com PostgreSQL */}
            <div
              onClick={() => setDarkMode(!darkMode)}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <p className="text-xs sm:text-sm font-extrabold">
                  Modo Escuro (Tema da Interface)
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Alterna instantaneamente entre o tema Escuro (#0A141D) e Claro (#F8FAFC).
                </p>
              </div>
              <div
                className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  darkMode ? 'bg-[#00D296]' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full bg-white shadow transform transition-transform"
                  style={{
                    transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
