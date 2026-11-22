import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  User,
  Palette,
  CheckCircle2,
  Wand2,
  Download,
  FileCheck,
  Lock,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Plus,
  X,
  Clock,
  Loader2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import {
  VetaroLogo,
  UltrasoundIcon,
  CardWaveBackground,
  CloudUploadVetaroIcon
} from '../components/icons/VetaroIcons';
import LayoutEditorDrawer from '../components/modals/LayoutEditorDrawer';
import ReportPreviewModal from '../components/modals/ReportPreviewModal';
import { api } from '../services/api';

// Limites seguros calibrados para VPS Linux 2 vCPUs / 4 GB RAM
// (Ultrassom carrega até 25 capturas Mindray por aba -> 4 abas abertas e até 2 gerações simultâneas; excedentes entram em fila)
const MAX_ULTRASOUND_TABS = 4;
const MAX_CONCURRENT_GENERATIONS = 2;

function createEmptyTab(seq) {
  return {
    id: `us-tab-${Date.now()}-${seq}-${Math.random().toString(36).slice(2, 6)}`,
    seq,
    mindrayFiles: [],
    rawFiles: [],
    status: 'idle', // 'idle' | 'queued' | 'generating' | 'done' | 'error'
    errorMessage: '',
    generatedOutput: '',
    downloadLinks: { pdfUrl: '', docxUrl: '' },
    reportPageTab: 'p1',
    reportParaEdicao: null
  };
}

function getTabLabel(tab) {
  const nomeGerado = tab.reportParaEdicao?.paciente?.nome;
  if (
    nomeGerado &&
    nomeGerado.trim() &&
    nomeGerado.trim().toLowerCase() !== 'paciente' &&
    nomeGerado.trim().toLowerCase() !== 'não identificado'
  ) {
    return nomeGerado.trim().slice(0, 22);
  }
  if (tab.mindrayFiles.length > 0) {
    return `Exame #${tab.seq} (${tab.mindrayFiles.length})`;
  }
  return `Exame #${tab.seq}`;
}

function revokeTabFiles(tab) {
  if (!tab || !Array.isArray(tab.mindrayFiles)) return;
  tab.mindrayFiles.forEach((f) => {
    if (f?.previewUrl && f.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(f.previewUrl);
      } catch (_) {}
    }
  });
}

function loadSavedTabs(storageKey) {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.slice(0, MAX_ULTRASOUND_TABS).map((t, idx) => ({
      ...createEmptyTab(t.seq || idx + 1),
      id: t.id || createEmptyTab(idx + 1).id,
      seq: t.seq || idx + 1,
      status: t.status === 'done' ? 'done' : 'idle',
      generatedOutput: typeof t.generatedOutput === 'string' ? t.generatedOutput : '',
      downloadLinks:
        t.downloadLinks && typeof t.downloadLinks === 'object'
          ? { pdfUrl: t.downloadLinks.pdfUrl || '', docxUrl: t.downloadLinks.docxUrl || '' }
          : { pdfUrl: '', docxUrl: '' },
      reportPageTab: t.reportPageTab === 'p2' ? 'p2' : 'p1',
      reportParaEdicao: t.reportParaEdicao || null
    }));
  } catch (_) {
    return null;
  }
}

export default function UltrasoundGenerator({
  darkMode,
  newUiEnabled = false,
  userProfile,
  layoutConfig,
  setLayoutConfig,
  onOpenProfile,
  onNavigateHome,
  onAddActivity,
  onToast
}) {
  const storageKey = `vetaro_ultrasound_tabs_${userProfile?.id || 'default'}`;
  const fileInputRef = useRef(null);
  const nextSeqRef = useRef(2);
  const activeGenerationsRef = useRef(0);
  const queueOrderRef = useRef([]);

  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [cotaInfo, setCotaInfo] = useState(null);
  const [carregandoCota, setCarregandoCota] = useState(true);

  const [tabs, setTabs] = useState(() => {
    const restored = loadSavedTabs(storageKey);
    if (restored && restored.length > 0) {
      const maxSeq = restored.reduce((acc, t) => Math.max(acc, t.seq || 1), 1);
      nextSeqRef.current = maxSeq + 1;
      return restored;
    }
    return [createEmptyTab(1)];
  });

  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id || '');
  const [previewModalTabId, setPreviewModalTabId] = useState(null);

  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Persiste abas e laudos gerados em sessionStorage (sobrevive navegação entre telas)
  useEffect(() => {
    try {
      const serializable = tabs.map((t) => ({
        id: t.id,
        seq: t.seq,
        status: t.status === 'done' ? 'done' : 'idle',
        generatedOutput: t.generatedOutput,
        downloadLinks: t.downloadLinks,
        reportPageTab: t.reportPageTab,
        reportParaEdicao: t.reportParaEdicao
      }));
      sessionStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch (_) {}
  }, [tabs, storageKey]);

  // Libera ObjectURLs das capturas Mindray ao desmontar componente
  useEffect(() => {
    return () => {
      tabsRef.current.forEach((t) => revokeTabFiles(t));
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const previewTab = previewModalTabId
    ? tabs.find((t) => t.id === previewModalTabId) || null
    : null;

  const updateTabById = useCallback((tabId, updater) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        return typeof updater === 'function' ? updater(t) : { ...t, ...updater };
      })
    );
  }, []);

  const carregarStatusCota = useCallback(async () => {
    try {
      const res = await api.getStatusCota();
      if (res && res.sucesso) {
        setCotaInfo(res);
      }
    } catch (err) {
      console.warn('Não foi possível obter status da cota:', err);
    } finally {
      setCarregandoCota(false);
    }
  }, []);

  useEffect(() => {
    carregarStatusCota();
  }, [carregarStatusCota]);

  const isCotaBloqueada =
    cotaInfo?.bloqueado === true &&
    !cotaInfo?.admin &&
    !cotaInfo?.ilimitado &&
    userProfile?.role !== 'admin';

  const podeEmitir =
    userProfile?.podeGerarLaudos ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'veterinario';

  // Gerenciamento de Abas
  const handleAddTab = () => {
    if (tabs.length >= MAX_ULTRASOUND_TABS) {
      if (onToast) {
        onToast(
          `Limite seguro de ${MAX_ULTRASOUND_TABS} abas simultâneas de ultrassom atingido. Feche uma aba concluída para abrir outra.`
        );
      }
      return;
    }
    const seq = nextSeqRef.current++;
    const nova = createEmptyTab(seq);
    setTabs((prev) => [...prev, nova]);
    setActiveTabId(nova.id);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    const target = tabs.find((t) => t.id === tabId);
    if (!target) return;

    if (target.status === 'generating') {
      if (onToast) onToast('Aguarde a conclusão da geração antes de fechar esta aba.');
      return;
    }

    if (target.rawFiles.length > 0 && target.status !== 'done') {
      const confirmar = window.confirm(
        `Deseja fechar a aba "${getTabLabel(target)}"? As imagens selecionadas não geradas serão descartadas.`
      );
      if (!confirmar) return;
    }

    queueOrderRef.current = queueOrderRef.current.filter((id) => id !== tabId);
    revokeTabFiles(target);

    if (tabs.length === 1) {
      const seq = nextSeqRef.current++;
      const fresh = createEmptyTab(seq);
      setTabs([fresh]);
      setActiveTabId(fresh.id);
      return;
    }

    const idx = tabs.findIndex((t) => t.id === tabId);
    const restantes = tabs.filter((t) => t.id !== tabId);
    setTabs(restantes);
    if (activeTabId === tabId) {
      const nextActive = restantes[Math.max(0, idx - 1)] || restantes[0];
      setActiveTabId(nextActive.id);
    }
  };

  const handleResetActiveTab = () => {
    if (!activeTab || activeTab.status === 'generating') return;
    revokeTabFiles(activeTab);
    updateTabById(activeTab.id, (t) => ({
      ...createEmptyTab(t.seq),
      id: t.id
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onToast) onToast('Aba limpa e pronta para um novo exame!');
  };

  const handleFilesSelected = (fileList) => {
    if (!activeTab) return;
    if (isCotaBloqueada) {
      if (onToast) onToast('Limite de cota mensal atingido. Faça upgrade do plano para enviar novas imagens.');
      return;
    }
    const arr = Array.from(fileList || []).slice(0, 25);
    if (arr.length === 0) return;

    revokeTabFiles(activeTab);
    updateTabById(activeTab.id, {
      rawFiles: arr,
      mindrayFiles: arr.map((f) => ({
        name: f.name,
        measure: `${(f.size / 1024).toFixed(0)} KB`,
        previewUrl: URL.createObjectURL(f)
      }))
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onToast) onToast(`${arr.length} imagem(ns) selecionada(s) na aba "${getTabLabel(activeTab)}"!`);
  };

  const executeGenerationForTab = useCallback(async (tabId) => {
    const currentTab = tabsRef.current.find((t) => t.id === tabId);
    if (!currentTab) return;

    activeGenerationsRef.current += 1;
    updateTabById(tabId, {
      status: 'generating',
      errorMessage: '',
      generatedOutput: '',
      downloadLinks: { pdfUrl: '', docxUrl: '' },
      reportPageTab: 'p1'
    });

    const now = new Date();
    const dateStr = `Gerado em ${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const fd = new FormData();
      currentTab.rawFiles.forEach((f) => fd.append('imagens', f));
      const res = await api.gerarUltrassom(fd);
      const pac = res.paciente || {};
      const resumoReal =
        `LAUDO OFICIAL DE ULTRASSONOGRAFIA ABDOMINAL\n` +
        `Paciente: ${pac.nome || 'Não identificado'} (${pac.especie || 'Canina'}${
          pac.idade ? `, ${pac.idade}` : ''
        }) | Responsável: ${pac.tutor || 'Não informado'}\n` +
        `Responsável Técnico: ${userProfile.name} (${userProfile.crmv}) — ${userProfile.clinicName}\n` +
        `--------------------------------------------------------------------------------\n` +
        `Laudo oficial em PDF e Word (.docx) compilado com sucesso a partir de ${currentTab.rawFiles.length} captura(s) do aparelho.`;

      const novoRelatorio = {
        id: `ultra-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        jobId: res.jobId,
        type: 'ultrassom',
        title: 'Laudo de Ultrassom',
        patient: `${pac.nome || 'Paciente'} (${pac.especie || 'Canina'})`,
        tutor: pac.tutor || '',
        date: dateStr,
        status: 'Concluído',
        summary: resumoReal,
        pdfUrl: res.pdfUrl,
        docxUrl: res.docxUrl,
        paciente: res.paciente,
        laudo: res.laudo
      };

      updateTabById(tabId, {
        status: 'done',
        errorMessage: '',
        generatedOutput: resumoReal,
        downloadLinks: { pdfUrl: res.pdfUrl || '', docxUrl: res.docxUrl || '' },
        reportParaEdicao: novoRelatorio
      });

      if (onAddActivity) onAddActivity(novoRelatorio);
      if (onToast) {
        onToast(`Laudo de ${pac.nome || getTabLabel(currentTab)} concluído com sucesso!`);
      }
      carregarStatusCota();
    } catch (err) {
      if (err.codigo === 'COTA_ATINGIDA' || err.message?.includes('cota')) {
        carregarStatusCota();
      }
      updateTabById(tabId, {
        status: 'error',
        errorMessage: err.message || 'Erro ao processar ultrassom.'
      });
      if (onToast) onToast(`Erro na aba ${getTabLabel(currentTab)}: ${err.message}`);
    } finally {
      activeGenerationsRef.current = Math.max(0, activeGenerationsRef.current - 1);
      while (
        activeGenerationsRef.current < MAX_CONCURRENT_GENERATIONS &&
        queueOrderRef.current.length > 0
      ) {
        const nextTabId = queueOrderRef.current.shift();
        const stillExists = tabsRef.current.some(
          (t) => t.id === nextTabId && t.status === 'queued'
        );
        if (stillExists) {
          executeGenerationForTab(nextTabId);
          break;
        }
      }
    }
  }, [updateTabById, userProfile, onAddActivity, onToast, carregarStatusCota]);

  const handleGenerate = async () => {
    if (!activeTab) return;
    if (isCotaBloqueada) {
      if (onToast) onToast('Limite de cota mensal atingido. Faça upgrade do seu plano para gerar laudos.');
      return;
    }
    if (!podeEmitir) {
      if (onToast) onToast('Sua conta não possui permissão para gerar laudos.');
      return;
    }
    if (activeTab.status === 'generating' || activeTab.status === 'queued') {
      return;
    }
    if (activeTab.rawFiles.length === 0) {
      if (onToast) onToast('Selecione pelo menos uma captura de ultrassom antes de gerar o laudo.');
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    if (activeGenerationsRef.current >= MAX_CONCURRENT_GENERATIONS) {
      if (!queueOrderRef.current.includes(activeTab.id)) {
        queueOrderRef.current.push(activeTab.id);
      }
      updateTabById(activeTab.id, { status: 'queued', errorMessage: '' });
      if (onToast) {
        onToast(
          `Aba "${getTabLabel(activeTab)}" adicionada à fila! Ela iniciará automaticamente assim que uma geração atual terminar.`
        );
      }
      return;
    }

    executeGenerationForTab(activeTab.id);
  };

  const generatingCount = tabs.filter((t) => t.status === 'generating').length;
  const queuedCount = tabs.filter((t) => t.status === 'queued').length;
  const isGenerating = activeTab?.status === 'generating';
  const isQueued = activeTab?.status === 'queued';

  return (
    <div className="space-y-5">
      {/* Barra de Mini-Abas Multi-Exames de Ultrassom */}
      <div
        className={`rounded-2xl p-2 border shadow-sm ${
          darkMode ? 'bg-[#0C1720] border-[#1E3545]' : 'bg-slate-100/90 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            const label = getTabLabel(tab);
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                role="tab"
                aria-selected={isActive}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition shrink-0 border select-none ${
                  isActive
                    ? darkMode
                      ? 'bg-[#0F1C26] text-white border-[#00D296]/70 shadow-md'
                      : 'bg-white text-[#0A141D] border-[#0D5C56]/50 shadow-sm'
                    : darkMode
                    ? 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-slate-200'
                    : 'bg-transparent text-slate-600 border-transparent hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                {tab.status === 'generating' ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#00D296] animate-spin shrink-0" />
                ) : tab.status === 'queued' ? (
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : tab.status === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00D296] shrink-0" />
                ) : tab.status === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <UltrasoundIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#00D296]' : 'opacity-60'}`} />
                )}

                <span className="max-w-[140px] truncate">{label}</span>

                {tab.status === 'queued' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Fila
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  disabled={tab.status === 'generating'}
                  title={
                    tab.status === 'generating'
                      ? 'Aguarde a geração terminar para fechar'
                      : 'Fechar aba'
                  }
                  className={`p-0.5 rounded-md transition ${
                    tab.status === 'generating'
                      ? 'opacity-30 cursor-not-allowed'
                      : 'opacity-50 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Botão Nova Aba */}
          <button
            type="button"
            onClick={handleAddTab}
            disabled={tabs.length >= MAX_ULTRASOUND_TABS}
            title={
              tabs.length >= MAX_ULTRASOUND_TABS
                ? `Máximo de ${MAX_ULTRASOUND_TABS} abas simultâneas para manter o servidor rápido`
                : 'Abrir nova aba para outro exame de ultrassom'
            }
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 border border-dashed transition ${
              tabs.length >= MAX_ULTRASOUND_TABS
                ? 'opacity-40 cursor-not-allowed border-slate-600 text-slate-500'
                : darkMode
                ? 'border-[#00D296]/40 text-[#00D296] hover:bg-[#00D296]/15'
                : 'border-[#0D5C56]/40 text-[#0D5C56] hover:bg-[#0D5C56]/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Aba</span>
            <span className="text-[10px] opacity-75">
              ({tabs.length}/{MAX_ULTRASOUND_TABS})
            </span>
          </button>

          {/* Indicador de gerações em segundo plano */}
          {(generatingCount > 0 || queuedCount > 0) && (
            <div className="ml-auto flex items-center gap-2 pl-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>
                  {generatingCount} gerando{queuedCount > 0 ? ` • ${queuedCount} na fila` : ''}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`relative rounded-2xl p-5 sm:p-7 border overflow-hidden transition shadow-lg ${
          darkMode
            ? 'bg-[#0F1C26] border-[#1E3545] text-white'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        <CardWaveBackground dark={darkMode} />

        {/* Cabeçalho */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Laudo de Ultrassonografia Abdominal
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30">
                {getTabLabel(activeTab)}
              </span>
            </div>
            <p
              className={`text-xs sm:text-sm mt-1 max-w-xl leading-relaxed ${
                darkMode ? 'text-slate-300' : 'text-[#52657A]'
              }`}
            >
              Envie as capturas de tela do Mindray com calipers e identificações para análise
              automática. Você pode alternar entre abas enquanto outro laudo é gerado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {activeTab.status === 'done' && (
              <button
                type="button"
                onClick={handleResetActiveTab}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
                  darkMode
                    ? 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-[#00D296]'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-[#0D5C56]'
                }`}
                title="Limpar esta aba para iniciar outro exame"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Novo nesta aba</span>
              </button>
            )}

            {cotaInfo && (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                  cotaInfo.admin || cotaInfo.ilimitado || userProfile?.role === 'admin'
                    ? darkMode
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isCotaBloqueada
                    ? darkMode
                      ? 'bg-rose-950/50 border-rose-500/50 text-rose-300 animate-pulse'
                      : 'bg-rose-50 border-rose-300 text-rose-700'
                    : darkMode
                    ? 'bg-[#142634] border-[#2A445A] text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={
                  cotaInfo.admin || cotaInfo.ilimitado || userProfile?.role === 'admin'
                    ? 'Acesso Administrativo: Cota ilimitada'
                    : `Cota mensal: ${cotaInfo.consumido}/${cotaInfo.limite} laudos utilizados`
                }
              >
                {cotaInfo.admin || cotaInfo.ilimitado || userProfile?.role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cota: Ilimitada {userProfile?.role === 'admin' || cotaInfo.admin ? '(Admin)' : '(Total)'}</span>
                  </>
                ) : isCotaBloqueada ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Cota Esgotada ({cotaInfo.consumido}/{cotaInfo.limite})</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cota: {cotaInfo.disponivel} restante(s)</span>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenProfile('perfil')}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs bg-[#E3FAF2] text-[#0D5C56] border-[#00D296]/40 hover:bg-[#ccf5e7]"
            >
              <User className="w-4 h-4 text-[#00A878] shrink-0" />
              <span className="leading-tight text-left">
                Meu Perfil /<br className="hidden sm:inline" /> Marca
              </span>
            </button>

            {podeEmitir && (
              <button
                type="button"
                onClick={() => setLayoutEditorOpen(!layoutEditorOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs ${
                  darkMode
                    ? 'bg-[#EBF4FA] text-[#173A56] border-slate-300 hover:bg-white'
                    : 'bg-[#F1F6FA] text-[#173A56] border-slate-300 hover:bg-slate-200/70'
                }`}
              >
                <Palette className="w-4 h-4 text-[#0D5C56] shrink-0" />
                <span className="leading-tight text-left">
                  Editor de<br className="hidden sm:inline" /> Layout
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Banner de Aviso de Cota Esgotada */}
        {isCotaBloqueada && (
          <div
            className={`relative z-10 mb-5 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-md ${
              darkMode
                ? 'bg-rose-950/40 border-rose-500/50 text-white'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-rose-900/60 text-rose-300' : 'bg-rose-100 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                  <span>Limite de Cota Mensal Atingido</span>
                  {cotaInfo && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {cotaInfo.consumido}/{cotaInfo.limite} laudos
                    </span>
                  )}
                </h4>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    darkMode ? 'text-rose-200/80' : 'text-rose-700'
                  }`}
                >
                  {cotaInfo?.motivo ||
                    'Você atingiu o limite mensal do seu plano. Para emitir novos laudos oficiais de ultrassom, faça upgrade agora.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenProfile('assinatura')}
              className="px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shrink-0 transition bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md hover:scale-[1.02]"
            >
              <span>Fazer Upgrade do Plano</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Gaveta / Editor A4 do Layout conectado ao PostgreSQL */}
        <LayoutEditorDrawer
          darkMode={darkMode}
          isOpen={layoutEditorOpen}
          onClose={() => setLayoutEditorOpen(false)}
          layoutConfig={layoutConfig}
          setLayoutConfig={setLayoutConfig}
          userProfile={userProfile}
          onToast={onToast}
        />

        {/* Input Oculto para Fotos Reais */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {/* Dropzone Tracejada */}
        <div
          onClick={() => {
            if (isCotaBloqueada) {
              if (onToast) onToast('Limite de cota mensal atingido. Faça upgrade do plano na aba Assinatura.');
              return;
            }
            if (fileInputRef.current) fileInputRef.current.click();
          }}
          onDragOver={(e) => {
            if (!isCotaBloqueada) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (isCotaBloqueada) {
              if (onToast) onToast('Limite de cota atingido. Faça upgrade do plano para enviar novas imagens.');
              return;
            }
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          className={`relative z-10 rounded-2xl border-2 border-dashed py-10 px-6 text-center transition group ${
            isCotaBloqueada
              ? darkMode
                ? 'bg-rose-950/20 border-rose-800/40 opacity-75 cursor-not-allowed'
                : 'bg-rose-50/50 border-rose-300/60 opacity-80 cursor-not-allowed'
              : darkMode
              ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936] cursor-pointer'
              : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC] cursor-pointer'
          }`}
        >
          <div className="flex justify-center mb-3">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                isCotaBloqueada
                  ? darkMode
                    ? 'bg-rose-900/40 text-rose-400'
                    : 'bg-rose-100 text-rose-600'
                  : darkMode
                  ? 'bg-[#0E3A38] text-[#00D296]'
                  : 'bg-[#C7F0E3] text-[#0D5C56]'
              }`}
            >
              {isCotaBloqueada ? (
                <Lock className="w-10 h-10" />
              ) : (
                <CloudUploadVetaroIcon className="w-11 h-11" />
              )}
            </div>
          </div>

          <p className="text-sm sm:text-base font-extrabold">
            {isCotaBloqueada
              ? 'Envio de Imagens Bloqueado por Limite de Cota'
              : 'Clique para selecionar as fotos ou arraste até aqui'}
          </p>
          <p
            className={`text-xs mt-1 font-medium ${
              darkMode ? 'text-slate-300/80' : 'text-[#52657A]'
            }`}
          >
            {isCotaBloqueada
              ? 'Faça upgrade do seu plano para liberar novas análises e laudos oficiais'
              : 'Formatos aceitos: JPG, PNG, WEBP (até 25 fotos por exame)'}
          </p>

          {activeTab.mindrayFiles.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-5 pt-4 border-t border-teal-500/20 flex flex-wrap items-center justify-center gap-2"
            >
              {activeTab.mindrayFiles.map((file, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
                    darkMode
                      ? 'bg-[#0B1822] border-[#00D296]/40 text-[#00D296]'
                      : 'bg-white border-[#0D5C56]/30 text-[#0D5C56]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{file.name}</span>
                  <span className="opacity-75 text-[10px]">({file.measure})</span>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  revokeTabFiles(activeTab);
                  updateTabById(activeTab.id, { mindrayFiles: [], rawFiles: [] });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-[11px] font-bold underline text-rose-400 ml-2"
              >
                Limpar fotos
              </button>
            </div>
          )}
        </div>

        {/* Alerta de erro desta aba, se houver */}
        {activeTab.status === 'error' && activeTab.errorMessage && (
          <div className="relative z-10 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeTab.errorMessage}</span>
          </div>
        )}

        {/* Botão Largo Principal */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || isQueued || !podeEmitir || isCotaBloqueada}
          className={`relative z-10 w-full mt-5 py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
            !podeEmitir
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : isCotaBloqueada
              ? darkMode
                ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300 cursor-not-allowed'
                : 'bg-rose-100 border border-rose-300 text-rose-700 cursor-not-allowed'
              : isQueued
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
              : darkMode
              ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110'
              : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110'
          }`}
        >
          {!podeEmitir ? (
            <>
              <Lock className="w-5 h-5" />
              <span>Geração de Laudo Bloqueada (Sem Permissão)</span>
            </>
          ) : isCotaBloqueada ? (
            <>
              <Lock className="w-5 h-5 text-rose-400" />
              <span>
                🔒 Limite de Cota Atingido ({cotaInfo?.consumido}/{cotaInfo?.limite} laudos) — Faça Upgrade
              </span>
            </>
          ) : isQueued ? (
            <>
              <Clock className="w-5 h-5 animate-pulse" />
              <span>Na fila de processamento (iniciará automaticamente)...</span>
            </>
          ) : (
            <>
              <Wand2 className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? 'Analisando capturas do Mindray com IA e compilando PDF/DOCX (15-30s)...'
                  : 'Gerar Laudo Oficial com IA'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Resultado Real Gerado pela IA (da aba ativa) */}
      {activeTab.generatedOutput && (
        <div
          className={`p-5 sm:p-6 rounded-2xl border space-y-4 transition ${
            darkMode ? 'bg-[#0F1C26] border-[#00D296]/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/40">
            <div className="flex items-center gap-2">
              <VetaroLogo size={22} dark={darkMode} textSize="text-base" />
              <span className="text-xs font-bold text-[#00D296]">
                • Laudo Gerado com Sucesso ({getTabLabel(activeTab)})!
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateTabById(activeTab.id, { reportPageTab: 'p1' })}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                  activeTab.reportPageTab === 'p1'
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                Página 1: Resumo do Exame
              </button>
              <button
                type="button"
                onClick={() => updateTabById(activeTab.id, { reportPageTab: 'p2' })}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                  activeTab.reportPageTab === 'p2'
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                Página 2: Imagens Enviadas ({activeTab.mindrayFiles.length})
              </button>
            </div>
          </div>

          {activeTab.reportPageTab === 'p1' ? (
            <pre
              className={`text-xs leading-relaxed whitespace-pre-wrap font-sans p-4 rounded-xl border ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {activeTab.generatedOutput}
            </pre>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeTab.mindrayFiles.map((img, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-center ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-[#0D3131] to-[#08151E] flex flex-col items-center justify-center text-[#00D296] mb-2 border border-teal-500/20 overflow-hidden">
                    {img.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <UltrasoundIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">{img.measure}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] font-bold truncate">{img.name}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              ← Voltar ao Início
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab.reportParaEdicao && (
                <button
                  type="button"
                  onClick={() => setPreviewModalTabId(activeTab.id)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] flex items-center gap-1.5 shadow-md hover:brightness-110"
                >
                  <Eye className="w-4 h-4" />
                  <span>Pré-Visualizar & Editar Laudo</span>
                </button>
              )}

              {activeTab.downloadLinks.docxUrl && (
                <a
                  href={activeTab.downloadLinks.docxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" /> Baixar Laudo em Word (.docx)
                </a>
              )}

              {activeTab.downloadLinks.pdfUrl && (
                <a
                  href={activeTab.downloadLinks.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar Laudo em PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-Visualização e Edição de Texto / Órgãos (vinculado à aba que o abriu) */}
      {previewTab && previewTab.reportParaEdicao && (
        <ReportPreviewModal
          report={previewTab.reportParaEdicao}
          darkMode={darkMode}
          newUiEnabled={newUiEnabled}
          onClose={() => setPreviewModalTabId(null)}
          onToast={onToast}
          onUpdateReport={(updated) => {
            const novoResumo = updated.paciente
              ? `LAUDO OFICIAL DE ULTRASSONOGRAFIA ABDOMINAL (ATUALIZADO)\n` +
                `Paciente: ${updated.paciente.nome || 'Paciente'} (${updated.paciente.especie || 'Canina'}${
                  updated.paciente.idade ? `, ${updated.paciente.idade}` : ''
                }) | Responsável: ${updated.paciente.tutor || 'Não informado'}\n` +
                `Responsável Técnico: ${userProfile.name} (${userProfile.crmv}) — ${userProfile.clinicName}\n` +
                `--------------------------------------------------------------------------------\n` +
                `Laudo oficial atualizado e recompilado com ${updated.laudo?.length || 0} órgão(s) avaliados.`
              : previewTab.generatedOutput;

            updateTabById(previewTab.id, {
              reportParaEdicao: updated,
              downloadLinks: { pdfUrl: updated.pdfUrl, docxUrl: updated.docxUrl },
              generatedOutput: novoResumo
            });
          }}
        />
      )}
    </div>
  );
}
