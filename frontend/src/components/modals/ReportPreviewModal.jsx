import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  FileCheck,
  Eye,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Save,
  Undo2,
  CheckCircle2,
  X,
  Columns
} from 'lucide-react';
import { api } from '../../services/api';
import { VetaroLogo } from '../icons/VetaroIcons';

function extrairOrgaosDeRelatorio(rep) {
  if (!rep) return [];
  let arr = null;
  if (Array.isArray(rep.laudo) && rep.laudo.length > 0) {
    arr = rep.laudo;
  } else if (Array.isArray(rep.laudoEstruturado) && rep.laudoEstruturado.length > 0) {
    arr = rep.laudoEstruturado;
  } else if (typeof rep.laudo === 'string') {
    try {
      const p = JSON.parse(rep.laudo);
      if (Array.isArray(p) && p.length > 0) arr = p;
    } catch (_) {}
  } else if (typeof rep.laudoEstruturado === 'string') {
    try {
      const p = JSON.parse(rep.laudoEstruturado);
      if (Array.isArray(p) && p.length > 0) arr = p;
    } catch (_) {}
  }

  if (arr) {
    return arr.map((item) => ({
      orgao: (item.orgao || 'ÓRGÃO').trim().toUpperCase(),
      texto: item.texto || item.achados || '',
      diagDif: item.diagDif || ''
    }));
  }

  if (rep.summary && typeof rep.summary === 'string') {
    const linhas = rep.summary.split('\n').filter((l) => l.trim().length > 0);
    const orgaosDetectados = [];
    for (const linha of linhas) {
      const match = linha.match(/^[•\s-]*([^:]+):(.*)$/);
      if (match && match[1]) {
        const nome = match[1].trim().toUpperCase();
        const texto = match[2].trim();
        const ignorar = [
          'PACIENTE',
          'TUTOR',
          'RESPONSÁVEL',
          'RESPONSAVEL',
          'ESPÉCIE',
          'ESPECIE',
          'RAÇA',
          'RACA',
          'DATA',
          'RESPONSÁVEL TÉCNICO',
          'RESPONSAVEL TECNICO',
          'PROCEDIMENTO',
          'DIAGNÓSTICO'
        ];
        if (!ignorar.some((ig) => nome === ig || nome.includes(ig))) {
          orgaosDetectados.push({
            orgao: nome,
            texto: texto,
            diagDif: ''
          });
        }
      }
    }
    if (orgaosDetectados.length > 0) return orgaosDetectados;
  }

  return [];
}

export default function ReportPreviewModal({
  report,
  darkMode,
  onClose,
  onToast,
  onUpdateReport
}) {
  if (!report) return null;

  const isSurgery = report.type === 'relatorio' || !!report.cirurgia;
  const initialJobId = useMemo(() => {
    if (report.jobId) return report.jobId;
    if (report.pdfUrl) {
      const match = report.pdfUrl.match(/\/downloads\/([^/?#]+)/);
      if (match) return match[1];
    }
    return '';
  }, [report]);

  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'split' : 'edit'
  );
  const [isRecompiling, setIsRecompiling] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dadosPacienteAbertos, setDadosPacienteAbertos] = useState(false);
  const [novoOrgaoNome, setNovoOrgaoNome] = useState('');
  const [adicionandoOrgao, setAdicionandoOrgao] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // URLs dinâmicas dos arquivos
  const [pdfUrlLive, setPdfUrlLive] = useState(report.pdfUrl || '');
  const [docxUrlLive, setDocxUrlLive] = useState(report.docxUrl || '');

  const pdfDirectUrl = useMemo(() => {
    if (!pdfUrlLive) return '';
    return `${pdfUrlLive}${pdfUrlLive.includes('?') ? '&' : '?'}inline=1#toolbar=0`;
  }, [pdfUrlLive]);

  // Estado dos dados do Paciente
  const [pacienteForm, setPacienteForm] = useState(() => {
    if (report.paciente && typeof report.paciente === 'object') {
      return {
        nome: report.paciente.nome || '',
        especie: report.paciente.especie || 'Canina',
        raca: report.paciente.raca || 'SRD',
        idade: report.paciente.idade || '',
        sexo: report.paciente.sexo || 'Macho',
        tutor: report.paciente.tutor || report.tutor || '',
        requisitante: report.paciente.requisitante || '',
        data: report.paciente.data || ''
      };
    }
    return {
      nome: report.patient ? report.patient.split('(')[0].trim() : 'Paciente',
      especie: report.patient && report.patient.includes('Felina') ? 'Felina' : 'Canina',
      raca: 'SRD',
      idade: '',
      sexo: 'Macho',
      tutor: report.tutor || '',
      requisitante: '',
      data: report.date || ''
    };
  });

  // Estado dos órgãos do laudo (Ultrassom)
  const [laudoForm, setLaudoForm] = useState(() => {
    const extraidos = extrairOrgaosDeRelatorio(report);
    if (extraidos.length > 0) return extraidos;
    return [
      { orgao: 'BEXIGA', texto: 'Repleta, paredes finas e regulares, conteúdo anecogênico límpido.', diagDif: '' },
      { orgao: 'RIM ESQUERDO', texto: 'Dimensões normais, contornos regulares, relação corticomedular preservada.', diagDif: '' },
      { orgao: 'RIM DIREITO', texto: 'Dimensões normais, contornos regulares, relação corticomedular preservada.', diagDif: '' },
      { orgao: 'BAÇO', texto: 'Dimensões normais, contornos regulares, parênquima homogêneo e ecotextura habitual.', diagDif: '' },
      { orgao: 'ESTÔMAGO', texto: 'Paredes preservadas, estratificação parietal evidente, conteúdo mucoso habitual.', diagDif: '' },
      { orgao: 'FÍGADO', texto: 'Dimensões normais, contornos regulares, parênquima homogêneo e ecogenicidade mantida.', diagDif: '' },
      { orgao: 'VESÍCULA BILIAR', texto: 'Repleta, paredes finas e regulares, conteúdo anecogênico límpido.', diagDif: '' },
      { orgao: 'ALÇAS INTESTINAIS', texto: 'Espessura parietal conservada, motilidade preservada nos segmentos avaliados.', diagDif: '' },
      { orgao: 'PÂNCREAS', texto: 'Região pancreática sem alterações ecográficas evidentes.', diagDif: '' },
      { orgao: 'ADRENAIS', texto: 'Dimensões e arquitetura habituais para a espécie.', diagDif: '' },
      { orgao: 'CAVIDADE ABDOMINAL', texto: 'Ausência de líquido livre cavitário.', diagDif: '' }
    ];
  });

  // Estado dos campos da cirurgia (se for cirurgia)
  const [cirurgiaForm, setCirurgiaForm] = useState(() => {
    const c = report.cirurgia || {};
    return {
      procedimento: c.procedimento || report.title?.replace('Relatório Cirúrgico — ', '') || 'Procedimento Cirúrgico',
      diagnosticoPreCirurgico: c.diagnosticoPreCirurgico || '',
      descricaoProcedimento: c.descricaoProcedimento || (typeof report.summary === 'string' ? report.summary : ''),
      evolucaoConsideracoes: c.evolucaoConsideracoes || ''
    };
  });

  // Backup para restaurar caso o usuário queira descartar
  const [backupOriginal, setBackupOriginal] = useState(null);

  // Efeito para sincronizar e carregar dados estruturados completos do exame
  useEffect(() => {
    if (!report) return;

    setPdfUrlLive(report.pdfUrl || '');
    setDocxUrlLive(report.docxUrl || '');

    // 1. Dados do Paciente
    let pac = {
      nome: report.patient ? report.patient.split('(')[0].trim() : 'Paciente',
      especie: report.patient && report.patient.includes('Felina') ? 'Felina' : 'Canina',
      raca: 'SRD',
      idade: '',
      sexo: 'Macho',
      tutor: report.tutor || '',
      requisitante: '',
      data: report.date || ''
    };
    if (report.paciente && typeof report.paciente === 'object') {
      pac = {
        nome: report.paciente.nome || pac.nome,
        especie: report.paciente.especie || pac.especie,
        raca: report.paciente.raca || pac.raca,
        idade: report.paciente.idade || pac.idade,
        sexo: report.paciente.sexo || pac.sexo,
        tutor: report.paciente.tutor || report.tutor || pac.tutor,
        requisitante: report.paciente.requisitante || pac.requisitante,
        data: report.paciente.data || pac.data
      };
    }
    setPacienteForm(pac);

    // 2. Dados do Ultrassom / Cirurgia
    if (isSurgery) {
      const c = report.cirurgia || {};
      const cirForm = {
        procedimento: c.procedimento || report.title?.replace('Relatório Cirúrgico — ', '') || 'Procedimento Cirúrgico',
        diagnosticoPreCirurgico: c.diagnosticoPreCirurgico || '',
        descricaoProcedimento: c.descricaoProcedimento || (typeof report.summary === 'string' ? report.summary : ''),
        evolucaoConsideracoes: c.evolucaoConsideracoes || ''
      };
      setCirurgiaForm(cirForm);

      if (initialJobId && (!cirForm.descricaoProcedimento || cirForm.descricaoProcedimento.length < 10)) {
        setLoadingData(true);
        api.getCirurgiaDados(initialJobId)
          .then((dados) => {
            if (dados && dados.cirurgia) {
              setCirurgiaForm((prev) => ({
                procedimento: dados.cirurgia.procedimento || prev.procedimento,
                diagnosticoPreCirurgico: dados.cirurgia.diagnosticoPreCirurgico || prev.diagnosticoPreCirurgico,
                descricaoProcedimento: dados.cirurgia.descricaoProcedimento || prev.descricaoProcedimento,
                evolucaoConsideracoes: dados.cirurgia.evolucaoConsideracoes || prev.evolucaoConsideracoes
              }));
            }
            if (dados && dados.paciente) {
              setPacienteForm((prev) => ({
                ...prev,
                nome: dados.paciente.nome || prev.nome,
                especie: dados.paciente.especie || prev.especie
              }));
            }
          })
          .catch((err) => console.warn('Aviso ao carregar dados de cirurgia:', err))
          .finally(() => setLoadingData(false));
      }
    } else {
      // Ultrassom
      const orgaosIniciais = extrairOrgaosDeRelatorio(report);
      if (orgaosIniciais.length > 0) {
        setLaudoForm(orgaosIniciais);
      } else if (initialJobId) {
        setLoadingData(true);
        api.getExameDados(initialJobId)
          .then((dados) => {
            if (dados && Array.isArray(dados.laudo) && dados.laudo.length > 0) {
              const orgaosServidor = dados.laudo.map((item) => ({
                orgao: (item.orgao || 'ÓRGÃO').trim().toUpperCase(),
                texto: item.texto || item.achados || '',
                diagDif: item.diagDif || ''
              }));
              setLaudoForm(orgaosServidor);
            }
            if (dados && dados.paciente) {
              setPacienteForm((prev) => ({
                ...prev,
                nome: dados.paciente.nome || prev.nome,
                especie: dados.paciente.especie || prev.especie,
                raca: dados.paciente.raca || prev.raca,
                idade: dados.paciente.idade || prev.idade,
                sexo: dados.paciente.sexo || prev.sexo,
                tutor: dados.paciente.tutor || prev.tutor,
                requisitante: dados.paciente.requisitante || prev.requisitante,
                data: dados.paciente.data || prev.data
              }));
            }
            if (dados && dados.pdfUrl) setPdfUrlLive(dados.pdfUrl);
            if (dados && dados.docxUrl) setDocxUrlLive(dados.docxUrl);
          })
          .catch((err) => console.warn('Aviso ao carregar dados do ultrassom:', err))
          .finally(() => setLoadingData(false));
      }
    }
    setHasUnsavedChanges(false);
  }, [report, initialJobId, isSurgery]);

  // Atualiza backup original quando os dados são carregados e não há alterações pendentes
  useEffect(() => {
    if (!hasUnsavedChanges && (laudoForm.length > 0 || cirurgiaForm.descricaoProcedimento)) {
      setBackupOriginal({
        paciente: JSON.parse(JSON.stringify(pacienteForm)),
        laudo: JSON.parse(JSON.stringify(laudoForm)),
        cirurgia: JSON.parse(JSON.stringify(cirurgiaForm))
      });
    }
  }, [hasUnsavedChanges, laudoForm.length, cirurgiaForm.descricaoProcedimento]);

  const handlePacienteChange = (campo, valor) => {
    setPacienteForm((prev) => ({ ...prev, [campo]: valor }));
    setHasUnsavedChanges(true);
  };

  const handleAlterarOrgao = (index, campo, valor) => {
    setLaudoForm((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [campo]: valor };
      return clone;
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoverOrgao = (index) => {
    const orgaoNome = laudoForm[index]?.orgao || 'o órgão';
    if (window.confirm(`Deseja remover "${orgaoNome}" deste laudo?`)) {
      setLaudoForm((prev) => prev.filter((_, i) => i !== index));
      setHasUnsavedChanges(true);
      if (onToast) onToast(`Órgão "${orgaoNome}" removido da lista.`);
    }
  };

  const handleMoverOrgao = (index, direcao) => {
    setLaudoForm((prev) => {
      const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
      if (novoIndex < 0 || novoIndex >= prev.length) return prev;
      const clone = [...prev];
      const temp = clone[index];
      clone[index] = clone[novoIndex];
      clone[novoIndex] = temp;
      return clone;
    });
    setHasUnsavedChanges(true);
  };

  const handleAdicionarNovoOrgao = (nome) => {
    const nomeFinal = (nome || novoOrgaoNome || '').trim().toUpperCase();
    if (!nomeFinal) return;

    setLaudoForm((prev) => [
      ...prev,
      {
        orgao: nomeFinal,
        texto: 'Dimensões normais, contornos regulares e ecotextura homogênea sem alterações.',
        diagDif: ''
      }
    ]);
    setNovoOrgaoNome('');
    setAdicionandoOrgao(false);
    setHasUnsavedChanges(true);
    if (onToast) onToast(`Órgão "${nomeFinal}" adicionado com sucesso!`);
  };

  const handleCirurgiaChange = (campo, valor) => {
    setCirurgiaForm((prev) => ({ ...prev, [campo]: valor }));
    setHasUnsavedChanges(true);
  };

  const handleRestaurar = () => {
    if (window.confirm('Deseja descartar as alterações feitas e voltar ao texto original da IA?')) {
      setPacienteForm(JSON.parse(JSON.stringify(backupOriginal.paciente)));
      setLaudoForm(JSON.parse(JSON.stringify(backupOriginal.laudo)));
      setCirurgiaForm(JSON.parse(JSON.stringify(backupOriginal.cirurgia)));
      setHasUnsavedChanges(false);
      if (onToast) onToast('Alterações descartadas.');
    }
  };

  const handleSalvarERecompilar = async () => {
    if (!initialJobId) {
      if (onToast) onToast('Identificador de exame ausente para recompilação direta.');
      return;
    }

    setIsRecompiling(true);
    try {
      let res;
      if (isSurgery) {
        res = await api.recompilarCirurgia({
          jobId: initialJobId,
          paciente: pacienteForm,
          cirurgia: cirurgiaForm
        });
      } else {
        res = await api.recompilarUltrassom({
          jobId: initialJobId,
          paciente: pacienteForm,
          laudo: laudoForm
        });
      }

      setPdfUrlLive(res.pdfUrl || pdfUrlLive);
      setDocxUrlLive(res.docxUrl || docxUrlLive);
      setHasUnsavedChanges(false);

      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          pdfUrl: res.pdfUrl,
          docxUrl: res.docxUrl,
          paciente: res.paciente,
          laudo: res.laudo,
          cirurgia: res.cirurgia,
          patient: `${res.paciente?.nome || pacienteForm.nome} (${res.paciente?.especie || pacienteForm.especie})`,
          tutor: res.paciente?.tutor || pacienteForm.tutor
        });
      }

      if (onToast) onToast('✅ Laudo atualizado! Novo PDF e Word gerados com sucesso.');
      // Alterna automaticamente para o preview para visualização imediata
      setActiveTab('preview');
    } catch (err) {
      if (onToast) onToast('Erro ao recompilar laudo: ' + err.message);
    } finally {
      setIsRecompiling(false);
    }
  };

  // URL para exibição inline do PDF dentro do iframe
  const iframePdfSrc = useMemo(() => {
    if (!pdfUrlLive) return '';
    const sep = pdfUrlLive.includes('?') ? '&' : '?';
    return `${pdfUrlLive}${sep}inline=1#toolbar=0&navpanes=0&view=FitH`;
  }, [pdfUrlLive]);

  const orgaosSugeridos = [
    'PÂNCREAS',
    'ADRENAIS',
    'LÍQUIDO LIVRE',
    'LINFONODOS',
    'ESTÔMAGO',
    'DUODENO',
    'JEJUNO',
    'CÓLON',
    'PRÓSTATA',
    'TESTÍCULOS',
    'ÚTERO',
    'OVÁRIOS'
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-6xl h-[92vh] sm:h-[88vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden transition ${
          darkMode
            ? 'bg-[#0B1622] border-slate-700/80 text-white'
            : 'bg-[#F8FAFC] border-slate-200 text-[#0A141D]'
        }`}
      >
        {/* BARRA SUPERIOR (HEADER) */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <VetaroLogo size={24} dark={darkMode} showText={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight truncate">
                  {isSurgery ? 'Relatório Cirúrgico' : 'Laudo de Ultrassonografia'} —{' '}
                  <span className="text-[#00D296]">{pacienteForm.nome || 'Paciente'}</span>
                </span>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Alterações pendentes
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {pacienteForm.especie} {pacienteForm.raca ? `• ${pacienteForm.raca}` : ''}{' '}
                {pacienteForm.tutor ? `• Tutor: ${pacienteForm.tutor}` : ''}
              </p>
            </div>
          </div>

          {/* Seletor de Modo / Abas */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 ${
                darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'preview'
                    ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visualizar</span> PDF
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'edit'
                    ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Texto</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('split')}
                title="Modo Lado a Lado"
                className={`hidden md:flex px-2.5 py-1.5 rounded-lg text-xs font-extrabold items-center gap-1 transition ${
                  activeTab === 'split'
                    ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
            </div>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border text-slate-400 hover:text-white transition ${
                darkMode
                  ? 'border-slate-800 bg-[#0A141D] hover:bg-slate-800'
                  : 'border-slate-200 bg-white hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL (CONTEÚDO DINÂMICO CONFORME ABA) */}
        <div
          className={`flex-1 overflow-hidden relative flex ${
            activeTab === 'split' ? 'flex-row' : 'flex-col'
          }`}
        >
          {/* MODO EDITOR DE TEXTO / ÓRGÃOS (ESQUERDA NO MODO SPLIT) */}
          {(activeTab === 'edit' || activeTab === 'split') && (
            <div
              className={`h-full overflow-y-auto p-4 sm:p-6 space-y-4 ${
                activeTab === 'split'
                  ? 'w-1/2 border-r border-slate-800/80'
                  : 'w-full max-w-4xl mx-auto'
              }`}
            >
              {loadingData && (
                <div className="p-3 rounded-xl bg-teal-500/15 border border-[#00D296]/30 flex items-center gap-2.5 text-xs text-[#00D296] animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Carregando órgãos e dados completos do exame direto do banco de dados...</span>
                </div>
              )}

              {/* Card Colapsável: Dados do Paciente e Tutor */}
              <div
                className={`rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div
                  onClick={() => setDadosPacienteAbertos(!dadosPacienteAbertos)}
                  className="px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold">
                        Identificação do Paciente & Tutor
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {pacienteForm.nome || 'Não identificado'} • {pacienteForm.especie} • Tutor:{' '}
                        {pacienteForm.tutor || 'Não informado'}
                      </p>
                    </div>
                  </div>
                  {dadosPacienteAbertos ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {dadosPacienteAbertos && (
                  <div className="p-4 sm:p-5 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Nome do Animal
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.nome}
                        onChange={(e) => handlePacienteChange('nome', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white focus:border-[#00D296]'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D] focus:border-[#0D5C56]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Espécie
                      </label>
                      <select
                        value={pacienteForm.especie}
                        onChange={(e) => handlePacienteChange('especie', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white focus:border-[#00D296]'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D] focus:border-[#0D5C56]'
                        }`}
                      >
                        <option value="Canina">Canina</option>
                        <option value="Felina">Felina</option>
                        <option value="Equina">Equina</option>
                        <option value="Outra">Outra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Raça
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.raca}
                        onChange={(e) => handlePacienteChange('raca', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Idade
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.idade}
                        placeholder="Ex: 8 anos"
                        onChange={(e) => handlePacienteChange('idade', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Sexo
                      </label>
                      <select
                        value={pacienteForm.sexo}
                        onChange={(e) => handlePacienteChange('sexo', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                        }`}
                      >
                        <option value="Macho">Macho</option>
                        <option value="Fêmea">Fêmea</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Nome do Tutor / Responsável
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.tutor}
                        onChange={(e) => handlePacienteChange('tutor', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Veterinário(a) Requisitante / Clínica
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.requisitante}
                        placeholder="Ex: Dra. Ana Paula (Clínica Veterinária Vida Animal)"
                        onChange={(e) => handlePacienteChange('requisitante', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Data do Exame
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.data}
                        placeholder="DD/MM/AAAA"
                        onChange={(e) => handlePacienteChange('data', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO ESPECÍFICA: CIRURGIA OU ULTRASSOM */}
              {isSurgery ? (
                /* FORMULÁRIO DE RELATÓRIO CIRÚRGICO */
                <div className="space-y-4">
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <label className="block text-xs font-extrabold uppercase text-[#00D296]">
                      Nome do Procedimento Cirúrgico
                    </label>
                    <input
                      type="text"
                      value={cirurgiaForm.procedimento}
                      onChange={(e) => handleCirurgiaChange('procedimento', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border font-bold text-sm ${
                        darkMode
                          ? 'bg-[#0A141D] border-slate-700 text-white focus:border-[#00D296]'
                          : 'bg-slate-50 border-slate-300 text-[#0A141D] focus:border-[#0D5C56]'
                      }`}
                    />
                  </div>

                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <label className="block text-xs font-extrabold uppercase text-[#00D296]">
                      1. Diagnóstico Pré-Cirúrgico
                    </label>
                    <textarea
                      rows={2}
                      value={cirurgiaForm.diagnosticoPreCirurgico}
                      onChange={(e) =>
                        handleCirurgiaChange('diagnosticoPreCirurgico', e.target.value)
                      }
                      className={`w-full p-3 rounded-xl border text-xs leading-relaxed ${
                        darkMode
                          ? 'bg-[#0A141D] border-slate-700 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                      }`}
                    />
                  </div>

                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <label className="block text-xs font-extrabold uppercase text-[#00D296]">
                      2. Descrição Técnica do Procedimento
                    </label>
                    <textarea
                      rows={6}
                      value={cirurgiaForm.descricaoProcedimento}
                      onChange={(e) =>
                        handleCirurgiaChange('descricaoProcedimento', e.target.value)
                      }
                      className={`w-full p-3 rounded-xl border text-xs leading-relaxed font-sans ${
                        darkMode
                          ? 'bg-[#0A141D] border-slate-700 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                      }`}
                    />
                  </div>

                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <label className="block text-xs font-extrabold uppercase text-[#00D296]">
                      3. Evolução e Considerações Finais
                    </label>
                    <textarea
                      rows={3}
                      value={cirurgiaForm.evolucaoConsideracoes}
                      onChange={(e) =>
                        handleCirurgiaChange('evolucaoConsideracoes', e.target.value)
                      }
                      className={`w-full p-3 rounded-xl border text-xs leading-relaxed ${
                        darkMode
                          ? 'bg-[#0A141D] border-slate-700 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                /* LISTA DE ÓRGÃOS DO LAUDO DE ULTRASSOM */
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Órgãos Avaliados ({laudoForm.length})
                    </h4>

                    <button
                      type="button"
                      onClick={() => setAdicionandoOrgao(!adicionandoOrgao)}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#00D296]/15 text-[#00D296] hover:bg-[#00D296]/25 transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Órgão</span>
                    </button>
                  </div>

                  {/* Formulário rápido para adicionar novo órgão */}
                  {adicionandoOrgao && (
                    <div
                      className={`p-4 rounded-2xl border space-y-3 animate-in fade-in ${
                        darkMode ? 'bg-[#0F232D] border-[#00D296]/40' : 'bg-emerald-50 border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#00D296]">
                          Escolha ou digite o nome do órgão a incluir:
                        </span>
                        <button
                          type="button"
                          onClick={() => setAdicionandoOrgao(false)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {orgaosSugeridos.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleAdicionarNovoOrgao(sug)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              darkMode
                                ? 'bg-[#0B1622] border-slate-700 text-slate-300 hover:border-[#00D296] hover:text-[#00D296]'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-[#0D5C56]'
                            }`}
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Ou digite o nome do órgão..."
                          value={novoOrgaoNome}
                          onChange={(e) => setNovoOrgaoNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdicionarNovoOrgao(novoOrgaoNome);
                          }}
                          className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold ${
                            darkMode
                              ? 'bg-[#0A141D] border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-[#0A141D]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleAdicionarNovoOrgao(novoOrgaoNome)}
                          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
                        >
                          Incluir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cards de cada Órgão */}
                  {laudoForm.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition group ${
                        darkMode
                          ? 'bg-[#0F1C26] border-slate-800/90 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#00D296]/15 text-[#00D296] text-[10px] font-extrabold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.orgao}
                            onChange={(e) => handleAlterarOrgao(idx, 'orgao', e.target.value)}
                            className={`font-extrabold text-xs uppercase tracking-wide px-2 py-0.5 rounded-lg border border-transparent focus:border-[#00D296] bg-transparent ${
                              darkMode ? 'text-white' : 'text-[#0A141D]'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoverOrgao(idx, 'cima')}
                              title="Subir posição"
                              className="p-1 rounded-lg text-slate-400 hover:text-white"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < laudoForm.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoverOrgao(idx, 'baixo')}
                              title="Descer posição"
                              className="p-1 rounded-lg text-slate-400 hover:text-white"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoverOrgao(idx)}
                            title="Remover este órgão do laudo"
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Textarea da Descrição do Órgão */}
                      <textarea
                        rows={3}
                        value={item.texto}
                        onChange={(e) => handleAlterarOrgao(idx, 'texto', e.target.value)}
                        placeholder="Descrição ultrassonográfica do órgão..."
                        className={`w-full p-3 rounded-xl border text-xs leading-relaxed font-sans ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-800 text-slate-200 focus:border-[#00D296]'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#0D5C56]'
                        }`}
                      />

                      {/* Campo Opcional: Diagnóstico Diferencial */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                          Diag. Dif.:
                        </span>
                        <input
                          type="text"
                          value={item.diagDif || ''}
                          placeholder="Opcional (ex: Sugere nefropatia crônica incipiente)"
                          onChange={(e) => handleAlterarOrgao(idx, 'diagDif', e.target.value)}
                          className={`w-full px-2.5 py-1 rounded-lg border text-[11px] ${
                            darkMode
                              ? 'bg-[#0A141D] border-slate-800 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODO PREVIEW REALISTA DO PDF (DIREITA NO MODO SPLIT OU TELA CHEIA NO PREVIEW) */}
          {(activeTab === 'preview' || activeTab === 'split') && (
            <div
              className={`h-full min-h-0 flex flex-col bg-slate-900 ${
                activeTab === 'split' ? 'w-1/2' : 'w-full'
              }`}
            >
              {pdfUrlLive ? (
                <div className="w-full h-full min-h-0 flex-1 flex flex-col relative">
                  {/* Barra de utilidades do PDF */}
                  <div
                    className={`px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
                      darkMode ? 'bg-[#0E1A24] border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-[#00D296]" />
                      <span className="text-[11px] truncate">
                        Documento Oficial ({pacienteForm.nome || 'Paciente'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={pdfUrlLive}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-700 hover:border-[#00D296] text-slate-300 hover:text-white transition inline-flex items-center gap-1"
                      >
                        <span>Abrir em Nova Aba</span>
                        <span className="text-[10px]">↗</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex-1 w-full min-h-0 relative bg-slate-900 overflow-hidden">
                    {pdfDirectUrl ? (
                      <iframe
                        key={pdfDirectUrl}
                        title="Pré-visualização do Laudo PDF"
                        src={pdfDirectUrl}
                        className="w-full h-full border-0 absolute inset-0 block bg-slate-900"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <FileText className="w-10 h-10 mb-2 text-slate-500 opacity-60" />
                        <p className="text-xs font-bold">PDF gerado no servidor.</p>
                        <a
                          href={pdfUrlLive}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-xs text-[#00D296] underline font-bold"
                        >
                          Clique para abrir em nova aba
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <FileText className="w-12 h-12 mb-3 text-slate-500 opacity-60" />
                  <p className="text-sm font-bold">Arquivo PDF ainda não gerado nesta sessão.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Edite as informações na aba "Editar Texto" e clique em "Salvar e Gerar Novo PDF".
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BARRA INFERIOR (FOOTER / ACTIONS) */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Lado Esquerdo: Restaurar ou Descartar */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleRestaurar}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Restaurar Original da IA</span>
              </button>
            )}
          </div>

          {/* Lado Direito: Salvar e Gerar Novo PDF + Downloads */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botão de Salvar e Recompilar */}
            <button
              type="button"
              onClick={handleSalvarERecompilar}
              disabled={isRecompiling}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition ${
                isRecompiling
                  ? 'bg-slate-700 text-slate-400 cursor-wait'
                  : hasUnsavedChanges
                  ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110 ring-2 ring-[#00D296]/50 animate-pulse'
                  : darkMode
                  ? 'bg-[#00D296] text-[#062E2B] hover:brightness-110'
                  : 'bg-[#0D5C56] text-white hover:brightness-110'
              }`}
            >
              {isRecompiling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recompilando PDF e Word...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{hasUnsavedChanges ? 'Salvar e Gerar Novo PDF' : 'Regerar PDF'}</span>
                </>
              )}
            </button>

            {/* Links de Download Atualizados */}
            {docxUrlLive && (
              <a
                href={docxUrlLive}
                target="_blank"
                rel="noreferrer"
                onClick={() => onToast && onToast('Arquivo Word (.docx) baixado com sucesso!')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-100 text-[#0A141D] hover:bg-slate-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-[#00D296]" />
                <span className="hidden sm:inline">Baixar</span> Word
              </a>
            )}

            {pdfUrlLive && (
              <a
                href={pdfUrlLive}
                target="_blank"
                rel="noreferrer"
                onClick={() => onToast && onToast('PDF baixado com sucesso!')}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 hover:brightness-110 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Baixar</span> PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
