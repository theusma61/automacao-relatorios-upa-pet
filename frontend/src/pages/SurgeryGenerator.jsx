import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  CheckCircle2,
  Wand2,
  Download,
  FileCheck,
  Stethoscope,
  Eye,
  Copy,
  Plus,
  Search,
  Lock,
  FileText,
  Upload,
  Sparkles,
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
  SurgicalFilePulseIcon,
  CameraSolidIcon
} from '../components/icons/VetaroIcons';
import ModeloCirurgicoModal from '../components/modals/ModeloCirurgicoModal';
import ReportPreviewModal from '../components/modals/ReportPreviewModal';
import { api } from '../services/api';

// Limites seguros calibrados para VPS Linux 2 vCPUs / 4 GB RAM
// (Frontend limita 5 abas abertas e no máximo 2 gerações simultâneas; excedentes entram na fila automática)
const MAX_SURGERY_TABS = 5;
const MAX_CONCURRENT_GENERATIONS = 2;

function createEmptyTab(seq) {
  return {
    id: `cir-tab-${Date.now()}-${seq}-${Math.random().toString(36).slice(2, 6)}`,
    seq,
    inputMode: 'text', // 'text' | 'file'
    surgeryText: '',
    surgeryDocFile: null,
    rawDocFile: null,
    surgeryPhotos: [],
    rawPhotoFiles: [],
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
  if (nomeGerado && nomeGerado.trim() && nomeGerado.trim().toLowerCase() !== 'paciente') {
    return nomeGerado.trim().slice(0, 22);
  }
  if (tab.surgeryText) {
    const m = tab.surgeryText.match(/(?:paciente|nome)\s*[:\-]\s*([^\n|;,]{2,26})/i);
    if (m && m[1] && m[1].trim()) {
      return m[1].trim().slice(0, 22);
    }
  }
  if (tab.surgeryDocFile?.name) {
    return tab.surgeryDocFile.name.replace(/\.[^.]+$/, '').slice(0, 22);
  }
  return `Laudo #${tab.seq}`;
}

function revokeTabPhotos(tab) {
  if (!tab || !Array.isArray(tab.surgeryPhotos)) return;
  tab.surgeryPhotos.forEach((p) => {
    if (p?.previewUrl && p.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(p.previewUrl);
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
    return parsed.slice(0, MAX_SURGERY_TABS).map((t, idx) => ({
      ...createEmptyTab(t.seq || idx + 1),
      id: t.id || createEmptyTab(idx + 1).id,
      seq: t.seq || idx + 1,
      inputMode: t.inputMode === 'file' ? 'file' : 'text',
      surgeryText: typeof t.surgeryText === 'string' ? t.surgeryText : '',
      status: t.status === 'done' ? 'done' : 'idle',
      generatedOutput: typeof t.generatedOutput === 'string' ? t.generatedOutput : '',
      downloadLinks: t.downloadLinks && typeof t.downloadLinks === 'object'
        ? { pdfUrl: t.downloadLinks.pdfUrl || '', docxUrl: t.downloadLinks.docxUrl || '' }
        : { pdfUrl: '', docxUrl: '' },
      reportPageTab: t.reportPageTab === 'p2' ? 'p2' : 'p1',
      reportParaEdicao: t.reportParaEdicao || null
    }));
  } catch (_) {
    return null;
  }
}

export default function SurgeryGenerator({
  darkMode,
  isMobileLayout = false,
  newUiEnabled = false,
  userProfile,
  layoutConfig,
  onOpenProfile,
  onNavigateHome,
  onAddActivity,
  onToast
}) {
  const storageKey = `vetaro_surgery_tabs_${userProfile?.id || 'default'}`;
  const docInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const nextSeqRef = useRef(2);
  const activeGenerationsRef = useRef(0);
  const queueOrderRef = useRef([]);

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

  // Garante que sempre exista uma aba ativa válida
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Persiste rascunhos/resultados textuais das abas em sessionStorage (sobrevive navegação no menu)
  useEffect(() => {
    try {
      const serializable = tabs.map((t) => ({
        id: t.id,
        seq: t.seq,
        inputMode: t.inputMode,
        surgeryText: t.surgeryText,
        status: t.status === 'done' ? 'done' : 'idle',
        generatedOutput: t.generatedOutput,
        downloadLinks: t.downloadLinks,
        reportPageTab: t.reportPageTab,
        reportParaEdicao: t.reportParaEdicao
      }));
      sessionStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch (_) {}
  }, [tabs, storageKey]);

  // Libera ObjectURLs das fotos ao desmontar componente (evita vazamento de RAM no navegador)
  useEffect(() => {
    return () => {
      tabsRef.current.forEach((t) => revokeTabPhotos(t));
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

  const [modelos, setModelos] = useState([]);
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [modeloSelecionado, setModeloSelecionado] = useState(null);

  const podeEmitir =
    userProfile?.podeGerarCirurgia ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'veterinario';

  // Gerenciamento de Abas
  const handleAddTab = () => {
    if (tabs.length >= MAX_SURGERY_TABS) {
      if (onToast) {
        onToast(`Limite seguro de ${MAX_SURGERY_TABS} abas simultâneas atingido. Feche uma aba concluída para abrir outra.`);
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

    const temConteudo =
      Boolean(target.surgeryText?.trim()) ||
      Boolean(target.rawDocFile) ||
      target.rawPhotoFiles.length > 0;

    if (temConteudo && target.status !== 'done') {
      const confirmar = window.confirm(
        `Deseja fechar a aba "${getTabLabel(target)}"? Os dados digitados não gerados serão perdidos.`
      );
      if (!confirmar) return;
    }

    // Remove da fila se estivesse aguardando
    queueOrderRef.current = queueOrderRef.current.filter((id) => id !== tabId);
    revokeTabPhotos(target);

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
    revokeTabPhotos(activeTab);
    updateTabById(activeTab.id, (t) => ({
      ...createEmptyTab(t.seq),
      id: t.id
    }));
    if (onToast) onToast('Aba limpa e pronta para um novo relatório!');
  };

  const handleInsertTemplate = () => {
    const template = `Paciente: Thor | Espécie: Canina | Sexo: Macho | Idade: 5 anos | Peso: 14 kg
Responsável: Carlos Silva | Data: ${new Date().toLocaleDateString('pt-BR')}
Procedimento: Orquiectomia pré-escrotal eletiva
Diagnóstico pré-cirúrgico: Esterilização eletiva

Descrição da técnica:
Antissepsia rigorosa em 3 ciclos com clorexidina degermante e alcoólica.
Incisão cutânea pré-escrotal longitudinal na rafe mediana.
Exteriorização dos testículos com dissecção romba da fáscia espermática.
Ligadura tripla do cordão espermático e vasos testiculares com fio Nylon 2-0.
Síntese do tecido subcutâneo com fio Poliglecaprone 3-0 em padrão intradérmico.
Síntese cutânea com fio Nylon 3-0 em pontos simples separados.

Recuperação pós-anestésica:
Paciente extubado acordado, parâmetros fisiológicos estáveis, sem hipotermia ou sangramentos.`;

    updateTabById(activeTab.id, { surgeryText: template });
    if (onToast) onToast('Modelo de exemplo inserido nesta aba!');
  };

  const carregarModelos = async () => {
    try {
      const res = await api.getModelosCirurgicos();
      if (res && Array.isArray(res.modelos)) {
        setModelos(res.modelos);
      }
    } catch (_) {}
  };

  useEffect(() => {
    carregarModelos();
  }, []);

  const handleDocSelected = (fileList) => {
    const f = fileList && fileList[0];
    if (!f || !activeTab) return;
    updateTabById(activeTab.id, {
      rawDocFile: f,
      surgeryDocFile: {
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`
      }
    });
    if (docInputRef.current) docInputRef.current.value = '';
    if (onToast) onToast(`Arquivo anexado na aba "${getTabLabel(activeTab)}"!`);
  };

  const handlePhotosSelected = (fileList) => {
    const arr = Array.from(fileList || []).slice(0, 5);
    if (arr.length === 0 || !activeTab) return;
    revokeTabPhotos(activeTab);
    updateTabById(activeTab.id, {
      rawPhotoFiles: arr,
      surgeryPhotos: arr.map((f, i) => ({
        name: f.name,
        label: `Foto ${i + 1} (${(f.size / 1024).toFixed(0)} KB)`,
        previewUrl: URL.createObjectURL(f)
      }))
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (onToast) onToast(`${arr.length} foto(s) anexada(s) nesta aba!`);
  };

  // Executa a geração de uma aba específica e dispara a próxima da fila automaticamente
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
      if (currentTab.rawDocFile) fd.append('documento', currentTab.rawDocFile);
      if (currentTab.surgeryText && currentTab.surgeryText.trim()) {
        fd.append('textoDigitado', currentTab.surgeryText.trim());
      }
      currentTab.rawPhotoFiles.forEach((f) => fd.append('fotos', f));

      const res = await api.gerarCirurgia(fd);
      const pac = res.paciente || {};
      const cir = res.cirurgia || {};
      const textReal =
        `RELATÓRIO CIRÚRGICO OFICIAL — ${(userProfile.clinicName || 'Vetaro').toUpperCase()}\n` +
        `Cirurgiã(o) Responsável: ${userProfile.name} (${userProfile.crmv})\n` +
        `Paciente: ${pac.nome || 'Paciente'} (${pac.especie || 'Canina'}) | Procedimento: ${
          cir.procedimento || 'Procedimento Cirúrgico'
        }\n` +
        `--------------------------------------------------------------------------------\n` +
        `1. DIAGNÓSTICO PRÉ-CIRÚRGICO:\n${cir.diagnosticoPreCirurgico || 'A critério clínico.'}\n\n` +
        `2. DESCRIÇÃO TÉCNICA DO PROCEDIMENTO:\n${
          cir.descricaoProcedimento || 'Procedimento realizado conforme protocolo institucional.'
        }\n\n` +
        `3. EVOLUÇÃO E CONSIDERAÇÕES:\n${
          cir.evolucaoConsideracoes || 'Paciente encaminhado para recuperação.'
        }`;

      const novoRelatorio = {
        id: `cirurg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        jobId: res.jobId,
        type: 'relatorio',
        title: `Relatório Cirúrgico — ${cir.procedimento || 'Oficial'}`,
        patient: `${pac.nome || 'Paciente'} (${pac.especie || 'Canina'})`,
        tutor: pac.tutor || '',
        date: dateStr,
        status: 'Concluído',
        summary: textReal,
        pdfUrl: res.pdfUrl,
        docxUrl: res.docxUrl,
        paciente: res.paciente,
        cirurgia: res.cirurgia,
        fotos: Array.isArray(res.fotos) ? res.fotos : [],
        legendasFotos: Array.isArray(res.legendasFotos) ? res.legendasFotos : []
      };

      updateTabById(tabId, {
        status: 'done',
        errorMessage: '',
        generatedOutput: textReal,
        downloadLinks: { pdfUrl: res.pdfUrl || '', docxUrl: res.docxUrl || '' },
        reportParaEdicao: novoRelatorio
      });

      if (onAddActivity) onAddActivity(novoRelatorio);
      if (onToast) {
        onToast(`Relatório de ${pac.nome || getTabLabel(currentTab)} concluído!`);
      }
    } catch (err) {
      updateTabById(tabId, {
        status: 'error',
        errorMessage: err.message || 'Erro ao processar cirurgia.'
      });
      if (onToast) onToast(`Erro na aba ${getTabLabel(currentTab)}: ${err.message}`);
    } finally {
      activeGenerationsRef.current = Math.max(0, activeGenerationsRef.current - 1);
      // Desenfileira próxima aba aguardando, se houver
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
  }, [updateTabById, userProfile, onAddActivity, onToast]);

  const handleGenerate = async () => {
    if (!activeTab) return;
    if (!podeEmitir) {
      if (onToast) onToast('Sua conta não possui permissão para gerar relatórios cirúrgicos.');
      return;
    }
    if (activeTab.status === 'generating' || activeTab.status === 'queued') {
      return;
    }

    const hasText = Boolean(activeTab.surgeryText && activeTab.surgeryText.trim().length >= 8);
    const hasDoc = Boolean(activeTab.rawDocFile);
    const hasPhotos = activeTab.rawPhotoFiles.length > 0;

    if (!hasText && !hasDoc && !hasPhotos) {
      if (onToast) onToast('Digite as informações da cirurgia ou selecione um arquivo/áudio antes de gerar.');
      if (activeTab.inputMode === 'file' && docInputRef.current) docInputRef.current.click();
      return;
    }

    // Se já houver MAX_CONCURRENT_GENERATIONS em andamento, coloca esta aba na fila automática
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

  const handleClonarModelo = async (id) => {
    try {
      const res = await api.clonarModeloCirurgico(id);
      if (onToast) onToast(`Modelo duplicado para seu perfil como "${res.modelo?.nome || 'Meu Modelo'}"!`);
      await carregarModelos();
    } catch (err) {
      if (onToast) onToast('Erro ao duplicar modelo: ' + err.message);
    }
  };

  const modelosFiltrados = modelos.filter((m) => {
    if (filtroOrigem === 'globais' && !m.isGlobal) return false;
    if (filtroOrigem === 'meus' && m.isGlobal) return false;
    const q = buscaModelo.toLowerCase().trim();
    if (!q) return true;
    const nome = (m.nome || '').toLowerCase();
    const proc = (m.procedimento || '').toLowerCase();
    const desc = (m.descricaoProcedimento || '').toLowerCase();
    const sin = Array.isArray(m.sinonimos) ? m.sinonimos.join(' ').toLowerCase() : '';
    return nome.includes(q) || proc.includes(q) || desc.includes(q) || sin.includes(q);
  });

  const generatingCount = tabs.filter((t) => t.status === 'generating').length;
  const queuedCount = tabs.filter((t) => t.status === 'queued').length;
  const isGenerating = activeTab?.status === 'generating';
  const isQueued = activeTab?.status === 'queued';

  return (
    <div className="space-y-5">
      {/* Barra de Abas Multi-Laudos Cirúrgicos */}
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
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#00D296]' : 'opacity-60'}`} />
                )}

                <span className="max-w-[130px] truncate">{label}</span>

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
            disabled={tabs.length >= MAX_SURGERY_TABS}
            title={
              tabs.length >= MAX_SURGERY_TABS
                ? `Máximo de ${MAX_SURGERY_TABS} abas simultâneas para manter o servidor rápido`
                : 'Abrir nova aba para outro relatório cirúrgico'
            }
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 border border-dashed transition ${
              tabs.length >= MAX_SURGERY_TABS
                ? 'opacity-40 cursor-not-allowed border-slate-600 text-slate-500'
                : darkMode
                ? 'border-[#00D296]/40 text-[#00D296] hover:bg-[#00D296]/15'
                : 'border-[#0D5C56]/40 text-[#0D5C56] hover:bg-[#0D5C56]/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Aba</span>
            <span className="text-[10px] opacity-75">
              ({tabs.length}/{MAX_SURGERY_TABS})
            </span>
          </button>

          {/* Indicador de fila / gerações em segundo plano */}
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

      {/* Card Principal da Aba Ativa */}
      <div
        className={`relative rounded-2xl p-5 sm:p-7 border overflow-hidden transition shadow-lg ${
          darkMode
            ? 'bg-[#0F1C26] border-[#1E3545] text-white'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        <CardWaveBackground dark={darkMode} />

        {/* Cabeçalho */}
        <div
          className={`relative z-10 flex flex-col sm:flex-row sm:items-start justify-between ${
            isMobileLayout && newUiEnabled ? 'gap-2.5 mb-4' : 'gap-4 mb-6'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`${isMobileLayout && newUiEnabled ? 'text-base' : 'text-lg sm:text-xl'} font-extrabold tracking-tight`}>
                Relatório Cirúrgico Oficial
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30">
                {getTabLabel(activeTab)}
              </span>
            </div>
            {!(isMobileLayout && newUiEnabled) && (
              <p
                className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
                  darkMode ? 'text-slate-300' : 'text-[#52657A]'
                }`}
              >
                Envie o documento da cirurgia (.docx, .pages, .txt ou áudio gravado) e fotos
                anexas opcionais. Você pode alternar entre abas enquanto outro laudo é gerado.
              </p>
            )}
          </div>

          {isMobileLayout && newUiEnabled ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
              <button
                type="button"
                onClick={() => onOpenProfile && onOpenProfile('estilo_cirurgia')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 border shrink-0 transition active:scale-95 ${
                  darkMode
                    ? 'bg-[#0A141D] text-[#00D296] border-[#00D296]/35'
                    : 'bg-[#E3FAF2] text-[#0D5C56] border-[#00D296]/40'
                }`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Padrão Cirúrgico • Editar</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenProfile && onOpenProfile('perfil')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border shrink-0 ${
                  darkMode
                    ? 'bg-[#142634] border-[#2A445A] text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <User className="w-3 h-3 text-[#00D296] shrink-0" />
                <span>{userProfile.crmv || 'Timbre'}</span>
              </button>
              {activeTab.status === 'done' && (
                <button
                  type="button"
                  onClick={handleResetActiveTab}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 border shrink-0 ${
                    darkMode
                      ? 'bg-slate-800/80 text-slate-200 border-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Novo</span>
                </button>
              )}
            </div>
          ) : (
          <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
            {activeTab.status === 'done' && (
              <button
                type="button"
                onClick={handleResetActiveTab}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
                  darkMode
                    ? 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-[#00D296]'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-[#0D5C56]'
                }`}
                title="Limpar esta aba para iniciar outro laudo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Novo nesta aba</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenProfile && onOpenProfile('estilo_cirurgia')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition ${
                darkMode
                  ? 'bg-[#0A141D] text-[#00D296] border-[#00D296]/40 hover:bg-[#00D296]/15'
                  : 'bg-slate-50 text-[#0D5C56] border-slate-300 hover:border-[#00D296]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#00D296]" />
              <span>Copiar Padrão Cirúrgico</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenProfile && onOpenProfile('perfil')}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-[#E3FAF2] text-[#0D5C56] border border-[#00D296]/40"
            >
              <User className="w-4 h-4 text-[#00A878]" />
              <span>Timbre: {userProfile.crmv}</span>
            </button>
          </div>
          )}
        </div>

        {/* Inputs ocultos */}
        <input
          ref={docInputRef}
          type="file"
          accept=".docx,.pages,.txt,.m4a,.mp3,.wav,.ogg,.opus"
          className="hidden"
          onChange={(e) => handleDocSelected(e.target.files)}
        />
        <input
          ref={photoInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhotosSelected(e.target.files)}
        />

        {/* SEÇÃO 1: INFORMAÇÕES DO PROCEDIMENTO CIRÚRGICO */}
        <div className="relative z-10 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <p
              className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider ${
                darkMode ? 'text-slate-200' : 'text-[#1E2D3D]'
              }`}
            >
              1. INFORMAÇÕES DO PROCEDIMENTO CIRÚRGICO
            </p>

            {/* Alternador de Modo: Digitar vs Arquivo */}
            <div
              className={`p-1 rounded-xl ${
                isMobileLayout && newUiEnabled ? 'w-full grid grid-cols-2' : 'flex items-center'
              } gap-1 border ${
                darkMode ? 'bg-[#0E1B26] border-[#22374A]' : 'bg-[#E2EBE8] border-slate-300/80'
              }`}
            >
              <button
                type="button"
                onClick={() => updateTabById(activeTab.id, { inputMode: 'text' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  activeTab.inputMode === 'text'
                    ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#0A1A24] shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>✍️ Digitar Informações</span>
              </button>
              <button
                type="button"
                onClick={() => updateTabById(activeTab.id, { inputMode: 'file' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  activeTab.inputMode === 'file'
                    ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#0A1A24] shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>📁 Anexar Arquivo / Áudio</span>
              </button>
            </div>
          </div>

          {activeTab.inputMode === 'text' ? (
            /* Modo 1: Digitar ou Colar Texto Livre Inteligente */
            <div
              className={`rounded-2xl border p-4 transition ${
                darkMode
                  ? 'bg-[#12222F] border-[#24394B] focus-within:border-[#00D296]'
                  : 'bg-white border-[#B2D6CD] focus-within:border-[#0D5C56]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-dashed border-slate-500/20">
                <span className="text-xs font-bold text-[#00A878] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Texto Livre Inteligente (A IA organiza e formaliza tudo no padrão oficial)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertTemplate}
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#00D296]/15 hover:bg-[#00D296]/25 text-[#00A878] border border-[#00D296]/40 transition"
                  >
                    + Inserir Modelo de Exemplo
                  </button>
                  {activeTab.surgeryText && (
                    <button
                      type="button"
                      onClick={() => updateTabById(activeTab.id, { surgeryText: '' })}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition px-2 py-1"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={activeTab.surgeryText}
                onChange={(e) => updateTabById(activeTab.id, { surgeryText: e.target.value })}
                rows={isMobileLayout && newUiEnabled ? 6 : 9}
                placeholder={`Cole ou digite aqui as informações da cirurgia...

Exemplo:
Paciente: Thor | Espécie: Canina | Macho | 4 anos | Peso: 15 kg
Responsável: Carlos Silva | Data: 19/11/2026
Procedimento: Celiotomia exploratória com enterotomia por corpo estranho.
Descrição: Antissepsia rigorosa em 3 ciclos com clorexidina degermante e alcoólica. Incisão mediana pré e pós-umbilical. Localizado corpo estranho linear em jejuno proximal. Enterotomia com lâmina 11, retirada de fragmento plástico. Enterorrafia com PDS 3-0 em pontos simples separados e omentopexia. Síntese muscular com nylon 2-0 Reverdin, subcutâneo com poliglecaprone 3-0 intradérmico e pele com nylon 3-0 Sultan.
Recuperação: Paciente extubado acordado, sem hipotermia ou sangramentos.`}
                className={`w-full text-xs sm:text-sm leading-relaxed outline-none resize-y font-mono bg-transparent ${
                  darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
              />

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-500/15 text-slate-400">
                <span>💡 Cole anotações do WhatsApp, prontuário ou bloco de notas livremente.</span>
                <span className="font-mono">{activeTab.surgeryText.length} caracteres</span>
              </div>
            </div>
          ) : (
            /* Modo 2: Upload de Arquivo / Áudio */
            <div>
              <div
                onClick={() => docInputRef.current && docInputRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleDocSelected(e.dataTransfer.files);
                  }
                }}
                className={`rounded-2xl border-2 border-dashed py-8 px-5 text-center cursor-pointer transition group ${
                  darkMode
                    ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]'
                    : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]'
                }`}
              >
                <div className="flex justify-center mb-2.5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                      darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C7F0E3] text-[#0D5C56]'
                    }`}
                  >
                    <SurgicalFilePulseIcon className="w-10 h-10" />
                  </div>
                </div>

                <p className="text-sm sm:text-base font-extrabold">
                  Selecione o arquivo da cirurgia
                </p>
                <p
                  className={`text-xs mt-1 font-medium ${
                    darkMode ? 'text-slate-300/80' : 'text-[#52657A]'
                  }`}
                >
                  Word (.docx), Pages (.pages), Texto (.txt) ou Áudios (.m4a, .mp3, .wav, .ogg)
                </p>

                {activeTab.surgeryDocFile && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-[#00D296]/20 border border-[#00D296] text-xs font-extrabold text-[#00D296]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{activeTab.surgeryDocFile.name}</span>
                    <span className="opacity-75">({activeTab.surgeryDocFile.size})</span>
                  </div>
                )}
              </div>

              {/* Campo opcional de observação extra quando em modo arquivo */}
              <div className="mt-3">
                <input
                  type="text"
                  value={activeTab.surgeryText}
                  onChange={(e) => updateTabById(activeTab.id, { surgeryText: e.target.value })}
                  placeholder="Observação ou detalhe complementar opcional (ex: complicação inesperada, fio alternativo)..."
                  className={`w-full text-xs px-3.5 py-2 rounded-xl border outline-none ${
                    darkMode
                      ? 'bg-[#101D27] border-[#22374A] text-slate-200 placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 2: 2. FOTOS INTRAOPERATÓRIAS / PEÇA CIRÚRGICA */}
        <div className="relative z-10 mb-5">
          <p
            className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-200' : 'text-[#1E2D3D]'
            }`}
          >
            2. FOTOS INTRAOPERATÓRIAS / PEÇA CIRÚRGICA (OPCIONAL - PÁGINA 2)
          </p>

          <div
            onClick={() => photoInputRef.current && photoInputRef.current.click()}
            className={`rounded-2xl border py-5 px-5 text-center cursor-pointer transition group ${
              darkMode
                ? 'bg-[#0C1822]/90 border-[#24394B] hover:border-[#00D296]'
                : 'bg-[#F5F9FA] border-slate-300 hover:border-[#0D5C56]'
            }`}
          >
            <div className="flex justify-center mb-1.5">
              <CameraSolidIcon
                className={`w-7 h-7 transition group-hover:scale-105 ${
                  darkMode ? 'text-slate-200' : 'text-[#0D5C56]'
                }`}
              />
            </div>
            <p
              className={`text-xs sm:text-sm font-bold ${
                darkMode ? 'text-slate-200' : 'text-[#2C3E50]'
              }`}
            >
              Clique para adicionar fotos da peça cirúrgica ou procedimento
            </p>

            {activeTab.surgeryPhotos.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-3 flex flex-wrap items-center justify-center gap-2"
              >
                {activeTab.surgeryPhotos.map((photo, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-lg bg-[#00D296]/15 border border-[#00D296]/40 text-[11px] font-bold text-[#00D296]"
                  >
                    📷 {photo.name} ({photo.label})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alerta de erro desta aba, se houver */}
        {activeTab.status === 'error' && activeTab.errorMessage && (
          <div className="relative z-10 mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeTab.errorMessage}</span>
          </div>
        )}

        {/* Barra flutuante de polegar no mobile (quando há texto/arquivo e ainda não foi gerado) */}
        {isMobileLayout && newUiEnabled && (Boolean(activeTab.surgeryText?.trim()) || Boolean(activeTab.rawDocFile)) && activeTab.status !== 'done' && (
          <div className="fixed bottom-[76px] left-3 right-3 z-20">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isQueued || !podeEmitir}
              className={`w-full min-h-[48px] py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-2xl transition active:scale-[0.98] ${
                !podeEmitir
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                  : isQueued
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] ring-2 ring-[#00D296]/35'
              }`}
            >
              <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? 'Gerando relatório cirúrgico...'
                  : isQueued
                  ? 'Na fila de geração...'
                  : 'Gerar Relatório Cirúrgico'}
              </span>
            </button>
          </div>
        )}

        {/* Botão Largo Principal */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || isQueued || !podeEmitir}
          className={`relative z-10 w-full py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
            !podeEmitir
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
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
              <span>Geração Cirúrgica Bloqueada (Sem Permissão)</span>
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
                  ? 'Identificando procedimento e aplicando modelos cirúrgicos...'
                  : 'Gerar Relatório Cirúrgico Oficial'}
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
            <div className="flex items-center gap-2.5">
              {userProfile?.logoUrl ? (
                <img
                  src={userProfile.logoUrl}
                  alt={userProfile.clinicName || 'Logo da Clínica'}
                  className="h-7 max-w-[110px] object-contain rounded bg-white px-1.5 py-0.5"
                />
              ) : (
                <VetaroLogo size={22} dark={darkMode} textSize="text-base" />
              )}
              <span className="text-xs font-bold text-[#00D296]">
                • Relatório Cirúrgico Concluído ({getTabLabel(activeTab)})!
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
                Página 1: Documento Oficial
              </button>
              {activeTab.surgeryPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateTabById(activeTab.id, { reportPageTab: 'p2' })}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                    activeTab.reportPageTab === 'p2'
                      ? 'bg-[#00D296] text-[#062E2B]'
                      : 'bg-slate-500/10 text-slate-400'
                  }`}
                >
                  Página 2: Fotos da Cirurgia ({activeTab.surgeryPhotos.length})
                </button>
              )}
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
              {activeTab.surgeryPhotos.map((img, i) => (
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
                        <span className="text-[10px] font-bold">{img.label}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] font-bold truncate">{img.name}</p>
                  <p className="text-[10px] text-slate-400 italic line-clamp-2 mt-0.5">
                    {activeTab.reportParaEdicao?.fotos?.[i]?.legenda || `Figura ${i + 1} - Registro fotográfico intraoperatório / peça cirúrgica`}
                  </p>
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
                  <span>Pré-Visualizar & Editar Relatório</span>
                </button>
              )}

              {activeTab.downloadLinks.docxUrl && (
                <a
                  href={activeTab.downloadLinks.docxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" /> Baixar Relatório em Word (.docx)
                </a>
              )}

              {activeTab.downloadLinks.pdfUrl && (
                <a
                  href={activeTab.downloadLinks.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar Relatório em PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Biblioteca de Modelos Cirúrgicos Padronizados */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border space-y-4 ${
          darkMode ? 'bg-[#0F1C26] border-[#1E3545]' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#00D296]" />
              <h3 className="text-base font-extrabold">
                Modelos Cirúrgicos Padronizados
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#00D296]/15 text-[#00D296]">
                {modelos.length} modelo(s)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Modelos institucionais da plataforma e seus modelos personalizados para
              estruturação automática pela IA.
            </p>
          </div>

          {podeEmitir && (
            <button
              type="button"
              onClick={() => {
                setModeloSelecionado(null);
                setModalMode('form');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Modelo Cirúrgico</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'globais', label: '🌐 Institucionais' },
              { id: 'meus', label: '🔒 Meus Modelos' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroOrigem(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  filtroOrigem === f.id
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : darkMode
                    ? 'bg-[#0A141D] text-slate-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={buscaModelo}
              onChange={(e) => setBuscaModelo(e.target.value)}
              placeholder="Buscar por procedimento, sinônimo ou palavra-chave..."
              className={`w-full pl-8 pr-4 py-1.5 text-xs rounded-xl border font-semibold ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-200 text-[#0A141D]'
              }`}
            />
          </div>
        </div>

        {modelosFiltrados.length === 0 ? (
          <div
            className={`py-8 text-center rounded-xl border border-dashed text-xs text-slate-400 ${
              darkMode ? 'border-slate-800 bg-[#0A141D]/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            Nenhum modelo cirúrgico encontrado para este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
            {modelosFiltrados.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800 hover:border-[#00D296]/50'
                    : 'bg-slate-50/70 border-slate-200 hover:border-[#0D5C56]/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-xs font-extrabold truncate">{m.nome}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        m.isGlobal
                          ? 'bg-[#00D296]/15 text-[#00D296]'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}
                    >
                      {m.isGlobal ? '🌐 Institucional' : '🔒 Meu Modelo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#00D296] font-bold mb-2 truncate">
                    {m.procedimento || m.nome}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {(m.descricaoProcedimento || '').substring(0, 130)}...
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/30">
                  <button
                    type="button"
                    onClick={() => {
                      setModeloSelecionado(m);
                      setModalMode('view');
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#00D296] hover:bg-[#00D296]/10 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </button>
                  {podeEmitir && m.isGlobal && (
                    <button
                      type="button"
                      onClick={() => handleClonarModelo(m.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicar
                    </button>
                  )}
                  {podeEmitir && (!m.isGlobal || userProfile.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        setModeloSelecionado(m);
                        setModalMode('form');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400 hover:bg-amber-500/10"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModeloCirurgicoModal
        darkMode={darkMode}
        mode={modalMode}
        modelo={modeloSelecionado}
        canEdit={
          podeEmitir &&
          modeloSelecionado &&
          (!modeloSelecionado.isGlobal || userProfile.role === 'admin')
        }
        onClose={() => setModalMode(null)}
        onSaved={carregarModelos}
        onSwitchToEdit={(mod) => {
          setModeloSelecionado(mod);
          setModalMode('form');
        }}
        onToast={onToast}
      />

      {/* Modal de Pré-Visualização e Edição da Cirurgia (vinculado à aba que o abriu) */}
      {previewTab && previewTab.reportParaEdicao && (
        <ReportPreviewModal
          report={previewTab.reportParaEdicao}
          darkMode={darkMode}
          newUiEnabled={newUiEnabled}
          onClose={() => setPreviewModalTabId(null)}
          onToast={onToast}
          onUpdateReport={(updated) => {
            updateTabById(previewTab.id, {
              reportParaEdicao: updated,
              downloadLinks: { pdfUrl: updated.pdfUrl, docxUrl: updated.docxUrl }
            });
          }}
        />
      )}
    </div>
  );
}
