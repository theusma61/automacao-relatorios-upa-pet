import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Columns,
  Camera,
  GripVertical,
  Palette,
  RotateCcw,
  ArrowLeft,
  User,
  Layers,
  LayoutGrid,
  Share2
} from 'lucide-react';
import { api } from '../../services/api';
import { VetaroLogo } from '../icons/VetaroIcons';
import ShareReportModal from './ShareReportModal';

const FONTES_CIRURGIA = [
  'Calibri, sans-serif',
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Roboto, sans-serif',
  'Times New Roman, serif',
  'Segoe UI, sans-serif'
];

const TAMANHOS_FONTE_CORPO = [
  '8pt', '8.5pt', '9pt', '9.5pt', '10pt', '10.5pt', '11pt', '11.5pt',
  '12pt', '13pt', '14pt', '15pt', '16pt', '18pt', '20pt', '22pt',
  '24pt', '26pt', '28pt', '30pt'
];

const TAMANHOS_FONTE_TITULO = [
  '10pt', '11pt', '12pt', '13pt', '13.5pt', '14pt', '15pt', '16pt',
  '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '30pt'
];

const ESPACAMENTOS_TOPICOS = [
  '4pt', '6pt', '8pt', '10pt', '12pt', '14pt', '16pt', '18pt',
  '20pt', '22pt', '24pt', '26pt', '28pt', '30pt'
];

const SECOES_CIRURGIA_META = {
  diagnostico: {
    campo: 'diagnosticoPreCirurgico',
    titulo: 'Diagnóstico Pré-Cirúrgico',
    rows: 2,
    extraClass: ''
  },
  descricao: {
    campo: 'descricaoProcedimento',
    titulo: 'Descrição Técnica do Procedimento',
    rows: 6,
    extraClass: 'font-sans'
  },
  evolucao: {
    campo: 'evolucaoConsideracoes',
    titulo: 'Evolução e Considerações Finais',
    rows: 3,
    extraClass: ''
  }
};

const ORDEM_SECOES_CIRURGIA_PADRAO = ['diagnostico', 'descricao', 'evolucao'];

function normalizarOrdemSecoesCirurgia(ordem) {
  const res = [];
  if (Array.isArray(ordem)) {
    for (const item of ordem) {
      const k = String(item || '').trim().toLowerCase();
      if (ORDEM_SECOES_CIRURGIA_PADRAO.includes(k) && !res.includes(k)) {
        res.push(k);
      }
    }
  }
  for (const k of ORDEM_SECOES_CIRURGIA_PADRAO) {
    if (!res.includes(k)) res.push(k);
  }
  return res;
}

const ESTILO_ULTRASSOM_BASE = {
  fontFamily: 'Calibri, sans-serif',
  fontSizeCabecalho: '10pt',
  fontSizeBody: '11pt',
  fontSizeTitulo: '14pt',
  paragraphSpacing: '8pt',
  lineHeight: '1.35',
  paginacaoTexto: 'preencher',
  mostrarAssinaturaImagem: true,
  mostrarAssinaturaTexto: true,
  corPrimaria: '#1B365D',
  corSecundaria: '#4A777A',
  marginTop: '20mm',
  marginBottom: '20mm',
  marginLeft: '15mm',
  marginRight: '15mm'
};

const ESTILO_CIRURGIA_BASE = {
  tipoCabecalho: 'logo-esquerda-dados-direita',
  tipoDadosPaciente: 'duas-colunas-limpo',
  estiloSecoes: 'negrito-inline',
  decoracaoTitulo: 'nenhuma',
  posicaoAssinatura: 'centro',
  mostrarAssinaturaImagem: true,
  mostrarAssinaturaTexto: true,
  rotuloResponsavel: 'Responsável',
  tituloDocumento: 'RELATÓRIO CIRÚRGICO',
  subtituloDocumento: '',
  corPrimaria: '#1B365D',
  corSecundaria: '#4A777A',
  fontFamily: 'Calibri, sans-serif',
  fontSizeBody: '11pt',
  fontSizeCabecalho: '11pt',
  fontSizeTitulo: '13.5pt',
  paragraphSpacing: '8pt'
};

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
  newUiEnabled = false,
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
  const [estiloCirurgiaAberto, setEstiloCirurgiaAberto] = useState(false);
  const [estiloUltrassomAberto, setEstiloUltrassomAberto] = useState(false);
  const [estiloPadraoUltrassom, setEstiloPadraoUltrassom] = useState(ESTILO_ULTRASSOM_BASE);
  const [estiloUltrassomForm, setEstiloUltrassomForm] = useState(ESTILO_ULTRASSOM_BASE);
  const [temEstiloUltrassomCustom, setTemEstiloUltrassomCustom] = useState(false);
  const [autoAtualizarPdf, setAutoAtualizarPdf] = useState(true);
  const [imagensUltrassom, setImagensUltrassom] = useState([]);
  const [dragFotoUsIdx, setDragFotoUsIdx] = useState(null);
  const [dragOverFotoUsIdx, setDragOverFotoUsIdx] = useState(null);
  const loadedJobIdRef = useRef('');
  const recompilarControllerRef = useRef(null);
  const studioContainerRef = useRef(null);
  const [studioSection, setStudioSection] = useState('conteudo'); // 'conteudo' | 'paciente' | 'estilo' | 'todos'
  const [studioSplitPct, setStudioSplitPct] = useState(() => {
    try {
      const saved = parseFloat(localStorage.getItem('vetaro_studio_split_pct') || '48');
      return !isNaN(saved) && saved >= 30 && saved <= 70 ? saved : 48;
    } catch (_) {
      return 48;
    }
  });
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const [mobileStyleSheetOpen, setMobileStyleSheetOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const shareDocId = report.dbId || initialJobId || (report.id ? String(report.id).replace(/^(ex|cir)-/, '') : '');
  const shareTipo = isSurgery ? 'cirurgia' : 'ultrassom';
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleViewportResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileViewport(mobile);
      if (mobile) {
        setActiveTab((prev) => (prev === 'split' ? 'preview' : prev));
      }
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    if (!isResizingSplit) return;
    const handleMove = (e) => {
      if (!studioContainerRef.current) return;
      const rect = studioContainerRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const pct = Math.max(30, Math.min(70, (relX / Math.max(1, rect.width)) * 100));
      setStudioSplitPct(Number(pct.toFixed(1)));
    };
    const handleUp = () => {
      setIsResizingSplit(false);
      try {
        localStorage.setItem('vetaro_studio_split_pct', String(studioSplitPct));
      } catch (_) {}
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingSplit, studioSplitPct]);

  const selecionarSecaoStudio = (sec) => {
    setStudioSection(sec);
    if (sec === 'paciente') setDadosPacienteAbertos(true);
    if (sec === 'estilo') {
      if (isSurgery) setEstiloCirurgiaAberto(true);
      else setEstiloUltrassomAberto(true);
    }
  };
  const [estiloPadraoCirurgia, setEstiloPadraoCirurgia] = useState(ESTILO_CIRURGIA_BASE);
  const [estiloCirurgiaForm, setEstiloCirurgiaForm] = useState(() => ({
    ...ESTILO_CIRURGIA_BASE,
    ...(report.cirurgia?.estiloOverride || {})
  }));
  const [temEstiloCustomizado, setTemEstiloCustomizado] = useState(
    Boolean(report.cirurgia?.estiloOverride && Object.keys(report.cirurgia.estiloOverride).length > 0)
  );
  const [novoOrgaoNome, setNovoOrgaoNome] = useState('');
  const [adicionandoOrgao, setAdicionandoOrgao] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [draggedOrgaoIdx, setDraggedOrgaoIdx] = useState(null);
  const [dragOverOrgaoIdx, setDragOverOrgaoIdx] = useState(null);
  const dragOrgaoPermitidoRef = useRef(false);
  const [ordemSecoesCirurgia, setOrdemSecoesCirurgia] = useState(() =>
    normalizarOrdemSecoesCirurgia(report.cirurgia?.ordemSecoes)
  );
  const [draggedSecaoCirIdx, setDraggedSecaoCirIdx] = useState(null);
  const [dragOverSecaoCirIdx, setDragOverSecaoCirIdx] = useState(null);
  const dragSecaoCirPermitidoRef = useRef(false);

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
        peso: report.paciente.peso || '',
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
      peso: '',
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

  // Estado das fotos intraoperatórias e legendas editáveis (Cirurgia)
  const [fotosCirurgia, setFotosCirurgia] = useState(() => {
    if (Array.isArray(report.fotos) && report.fotos.length > 0) {
      return report.fotos.map((f, idx) => ({
        index: f.index ?? idx,
        nome: f.nome || `foto_${idx + 1}.jpg`,
        url: f.url || f.previewUrl || '',
        legenda: f.legenda || `Figura ${idx + 1} - Registro fotográfico intraoperatório / peça cirúrgica`
      }));
    }
    return [];
  });

  // Backup para restaurar caso o usuário queira descartar
  const [backupOriginal, setBackupOriginal] = useState(null);

  // Efeito para sincronizar e carregar dados estruturados completos do exame (apenas quando muda o job/relatório aberto)
  useEffect(() => {
    if (!report) return;
    const chaveAtual = `${initialJobId || report.id || ''}_${isSurgery ? 'cir' : 'us'}`;
    if (loadedJobIdRef.current === chaveAtual && initialJobId) {
      return;
    }
    loadedJobIdRef.current = chaveAtual;

    setPdfUrlLive(report.pdfUrl || '');
    setDocxUrlLive(report.docxUrl || '');

    // 1. Dados do Paciente
    let pac = {
      nome: report.patient ? report.patient.split('(')[0].trim() : 'Paciente',
      especie: report.patient && report.patient.includes('Felina') ? 'Felina' : 'Canina',
      raca: 'SRD',
      idade: '',
      sexo: 'Macho',
      peso: '',
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
        peso: report.paciente.peso || pac.peso,
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
      setOrdemSecoesCirurgia(normalizarOrdemSecoesCirurgia(c.ordemSecoes));

      if (Array.isArray(report.fotos) && report.fotos.length > 0) {
        setFotosCirurgia(
          report.fotos.map((f, idx) => ({
            index: f.index ?? idx,
            nome: f.nome || `foto_${idx + 1}.jpg`,
            url: f.url || f.previewUrl || '',
            legenda: f.legenda || `Figura ${idx + 1} - Registro fotográfico intraoperatório / peça cirúrgica`
          }))
        );
      } else {
        setFotosCirurgia([]);
      }

      if (initialJobId) {
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
              if (Array.isArray(dados.cirurgia.ordemSecoes) && dados.cirurgia.ordemSecoes.length > 0) {
                setOrdemSecoesCirurgia(normalizarOrdemSecoesCirurgia(dados.cirurgia.ordemSecoes));
              }
            }
            if (dados && dados.paciente) {
              setPacienteForm((prev) => ({
                ...prev,
                nome: dados.paciente.nome || prev.nome,
                especie: dados.paciente.especie || prev.especie,
                raca: dados.paciente.raca || prev.raca,
                sexo: dados.paciente.sexo || prev.sexo,
                idade: dados.paciente.idade || prev.idade,
                peso: dados.paciente.peso || prev.peso,
                tutor: dados.paciente.tutor || prev.tutor,
                requisitante: dados.paciente.requisitante || prev.requisitante,
                data: dados.paciente.data || prev.data
              }));
            }
            if (dados && Array.isArray(dados.fotos)) {
              setFotosCirurgia(dados.fotos);
            }
            if (dados && dados.estiloPadrao) {
              const padraoMerged = { ...ESTILO_CIRURGIA_BASE, ...dados.estiloPadrao };
              setEstiloPadraoCirurgia(padraoMerged);
              if (dados.estiloOverride && Object.keys(dados.estiloOverride).length > 0) {
                setEstiloCirurgiaForm({ ...padraoMerged, ...dados.estiloOverride });
                setTemEstiloCustomizado(true);
              } else {
                setEstiloCirurgiaForm(padraoMerged);
                setTemEstiloCustomizado(false);
              }
            }
            if (dados && dados.pdfUrl) {
              setPdfUrlLive((prev) => (prev && prev.includes('?v=') && !dados.pdfUrl.includes('?v=') ? prev : dados.pdfUrl));
            }
            if (dados && dados.docxUrl) {
              setDocxUrlLive((prev) => (prev && prev.includes('?v=') && !dados.docxUrl.includes('?v=') ? prev : dados.docxUrl));
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
      }
      if (initialJobId) {
        if (orgaosIniciais.length === 0) setLoadingData(true);
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
            if (dados && Array.isArray(dados.imagens)) {
              setImagensUltrassom(dados.imagens);
            }
            if (dados && dados.paciente) {
              setPacienteForm((prev) => ({
                ...prev,
                nome: dados.paciente.nome || prev.nome,
                especie: dados.paciente.especie || prev.especie,
                raca: dados.paciente.raca || prev.raca,
                idade: dados.paciente.idade || prev.idade,
                sexo: dados.paciente.sexo || prev.sexo,
                peso: dados.paciente.peso || prev.peso,
                tutor: dados.paciente.tutor || prev.tutor,
                requisitante: dados.paciente.requisitante || prev.requisitante,
                data: dados.paciente.data || prev.data
              }));
            }
            if (dados && dados.estiloPadrao) {
              const padraoUs = { ...ESTILO_ULTRASSOM_BASE, ...dados.estiloPadrao };
              setEstiloPadraoUltrassom(padraoUs);
              if (dados.estiloOverride && Object.keys(dados.estiloOverride).length > 0) {
                setEstiloUltrassomForm({ ...padraoUs, ...dados.estiloOverride });
                setTemEstiloUltrassomCustom(true);
              } else {
                setEstiloUltrassomForm(padraoUs);
                setTemEstiloUltrassomCustom(false);
              }
            }
            if (dados && dados.pdfUrl) {
              setPdfUrlLive((prev) => (prev && prev.includes('?v=') && !dados.pdfUrl.includes('?v=') ? prev : dados.pdfUrl));
            }
            if (dados && dados.docxUrl) {
              setDocxUrlLive((prev) => (prev && prev.includes('?v=') && !dados.docxUrl.includes('?v=') ? prev : dados.docxUrl));
            }
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
        cirurgia: JSON.parse(JSON.stringify(cirurgiaForm)),
        fotosCirurgia: JSON.parse(JSON.stringify(fotosCirurgia)),
        ordemSecoesCirurgia: [...ordemSecoesCirurgia],
        estiloCirurgia: JSON.parse(JSON.stringify(estiloCirurgiaForm)),
        temEstiloCustomizado
      });
    }
  }, [hasUnsavedChanges, laudoForm.length, cirurgiaForm.descricaoProcedimento, fotosCirurgia.length]);

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

  const handleReordenarOrgao = (origemIdx, destinoIdx) => {
    if (origemIdx === null || destinoIdx === null || origemIdx === destinoIdx) return;
    setLaudoForm((prev) => {
      if (origemIdx < 0 || origemIdx >= prev.length || destinoIdx < 0 || destinoIdx >= prev.length) return prev;
      const clone = [...prev];
      const [movido] = clone.splice(origemIdx, 1);
      clone.splice(destinoIdx, 0, movido);
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

  const handleMoverSecaoCirurgia = (index, direcao) => {
    setOrdemSecoesCirurgia((prev) => {
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

  const handleReordenarSecaoCirurgia = (origemIdx, destinoIdx) => {
    if (origemIdx === null || destinoIdx === null || origemIdx === destinoIdx) return;
    setOrdemSecoesCirurgia((prev) => {
      if (origemIdx < 0 || origemIdx >= prev.length || destinoIdx < 0 || destinoIdx >= prev.length) return prev;
      const clone = [...prev];
      const [movido] = clone.splice(origemIdx, 1);
      clone.splice(destinoIdx, 0, movido);
      return clone;
    });
    setHasUnsavedChanges(true);
  };

  const handleEstiloCirurgiaChange = (campo, valor) => {
    setEstiloCirurgiaForm((prev) => ({ ...prev, [campo]: valor }));
    setTemEstiloCustomizado(true);
    setHasUnsavedChanges(true);
  };

  const handleResetarEstiloCirurgia = () => {
    setEstiloCirurgiaForm({ ...estiloPadraoCirurgia });
    setTemEstiloCustomizado(false);
    setHasUnsavedChanges(true);
    if (onToast) onToast('Visual redefinido para o padrão das Configurações.');
  };

  const handleEstiloUltrassomChange = (campo, valor) => {
    setEstiloUltrassomForm((prev) => ({ ...prev, [campo]: valor }));
    setTemEstiloUltrassomCustom(true);
    setHasUnsavedChanges(true);
  };

  const handleResetarEstiloUltrassom = () => {
    setEstiloUltrassomForm({ ...estiloPadraoUltrassom });
    setTemEstiloUltrassomCustom(false);
    setHasUnsavedChanges(true);
    if (onToast) onToast('Visual do laudo redefinido para o padrão das Configurações.');
  };

  const handleAlterarLegendaFoto = (index, novaLegenda) => {
    setFotosCirurgia((prev) =>
      prev.map((foto, i) => (i === index ? { ...foto, legenda: novaLegenda } : foto))
    );
    setHasUnsavedChanges(true);
  };

  const handleRestaurar = () => {
    if (window.confirm('Deseja descartar as alterações feitas e voltar ao texto original da IA?')) {
      setPacienteForm(JSON.parse(JSON.stringify(backupOriginal.paciente)));
      setLaudoForm(JSON.parse(JSON.stringify(backupOriginal.laudo)));
      setCirurgiaForm(JSON.parse(JSON.stringify(backupOriginal.cirurgia)));
      if (backupOriginal.fotosCirurgia) setFotosCirurgia(JSON.parse(JSON.stringify(backupOriginal.fotosCirurgia)));
      if (backupOriginal.ordemSecoesCirurgia) setOrdemSecoesCirurgia([...backupOriginal.ordemSecoesCirurgia]);
      if (backupOriginal.estiloCirurgia) setEstiloCirurgiaForm(JSON.parse(JSON.stringify(backupOriginal.estiloCirurgia)));
      if (backupOriginal.temEstiloCustomizado !== undefined) setTemEstiloCustomizado(backupOriginal.temEstiloCustomizado);
      setHasUnsavedChanges(false);
      if (onToast) onToast('Alterações descartadas.');
    }
  };

  const handleSalvarERecompilar = async (opcoesExec = {}) => {
    const silent = Boolean(opcoesExec?.silent);
    if (!initialJobId) {
      if (!silent && onToast) onToast('Identificador de exame ausente para recompilação direta.');
      return;
    }

    if (recompilarControllerRef.current) {
      recompilarControllerRef.current.abort();
    }
    const controller = new AbortController();
    recompilarControllerRef.current = controller;
    setIsRecompiling(true);
    try {
      let res;
      if (isSurgery) {
        const legendasFotos = fotosCirurgia.map((f) => f.legenda || '');
        res = await api.recompilarCirurgia({
          jobId: initialJobId,
          paciente: pacienteForm,
          cirurgia: { ...cirurgiaForm, legendasFotos, ordemSecoes: ordemSecoesCirurgia },
          legendasFotos,
          estiloOverride: temEstiloCustomizado ? estiloCirurgiaForm : null
        }, { signal: controller.signal });
        if (Array.isArray(res.fotos)) {
          setFotosCirurgia(res.fotos);
        }
      } else {
        res = await api.recompilarUltrassom({
          jobId: initialJobId,
          paciente: pacienteForm,
          laudo: laudoForm,
          estiloOverride: temEstiloUltrassomCustom ? estiloUltrassomForm : null,
          ...(imagensUltrassom.length > 0 ? { ordemImagens: imagensUltrassom.map((f) => f.nome) } : {})
        }, { signal: controller.signal });
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
          fotos: res.fotos || fotosCirurgia,
          patient: `${res.paciente?.nome || pacienteForm.nome} (${res.paciente?.especie || pacienteForm.especie})`,
          tutor: res.paciente?.tutor || pacienteForm.tutor
        });
      }

      if (!silent) {
        if (onToast) onToast('✅ Laudo atualizado! Novo PDF e Word gerados com sucesso.');
        setActiveTab((prev) => (prev === 'edit' ? 'preview' : prev));
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (onToast) onToast('Erro ao recompilar laudo: ' + err.message);
    } finally {
      if (recompilarControllerRef.current === controller) {
        setIsRecompiling(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recompilarControllerRef.current) {
        recompilarControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-atualização em tempo real com debounce inteligente (1.8s) para evitar sobrecarga no navegador e servidor
  useEffect(() => {
    if (!autoAtualizarPdf || !hasUnsavedChanges || isRecompiling || loadingData || !initialJobId) return;
    const timer = setTimeout(() => {
      handleSalvarERecompilar({ silent: true });
    }, 1800);
    return () => clearTimeout(timer);
  }, [
    autoAtualizarPdf,
    hasUnsavedChanges,
    loadingData,
    initialJobId,
    pacienteForm,
    cirurgiaForm,
    ordemSecoesCirurgia,
    estiloCirurgiaForm,
    temEstiloCustomizado,
    fotosCirurgia,
    laudoForm,
    imagensUltrassom,
    estiloUltrassomForm,
    temEstiloUltrassomCustom
  ]);

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

  const isStudioMode = Boolean(newUiEnabled);
  const isStudioMobile = isStudioMode && isMobileViewport;
  const mostrarCardPaciente = !isStudioMode || studioSection === 'todos' || studioSection === 'paciente';
  const mostrarCardEstilo = !isStudioMode || studioSection === 'todos' || studioSection === 'estilo';
  const mostrarCardConteudo = !isStudioMode || studioSection === 'todos' || studioSection === 'conteudo';
  const mostrarCardFotos = !isSurgery && imagensUltrassom.length > 0 && (!isStudioMode || studioSection === 'todos' || studioSection === 'fotos');

  const handleMoverFotoUs = (idx, direcao) => {
    const novoIdx = direcao === 'antes' ? idx - 1 : idx + 1;
    if (novoIdx < 0 || novoIdx >= imagensUltrassom.length) return;
    setImagensUltrassom((prev) => {
      const copia = [...prev];
      const [movida] = copia.splice(idx, 1);
      copia.splice(novoIdx, 0, movida);
      return copia;
    });
    setHasUnsavedChanges(true);
  };

  const handleDropFotoUs = (fromIdx, toIdx) => {
    if (fromIdx === null || fromIdx === undefined || fromIdx === toIdx) return;
    setImagensUltrassom((prev) => {
      const copia = [...prev];
      const [movida] = copia.splice(fromIdx, 1);
      copia.splice(toIdx, 0, movida);
      return copia;
    });
    setHasUnsavedChanges(true);
  };

  return (
    <div
      onClick={isStudioMode ? undefined : onClose}
      className={
        isStudioMode
          ? 'fixed inset-0 z-50 flex flex-col animate-in fade-in duration-150'
          : 'fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200'
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${
          isStudioMode
            ? 'w-screen h-screen rounded-none border-0'
            : 'w-full max-w-6xl h-[92vh] sm:h-[88vh] rounded-2xl border shadow-2xl'
        } flex flex-col overflow-hidden transition ${
          darkMode
            ? 'bg-[#0A141D] border-slate-700/80 text-white'
            : 'bg-[#F8FAFC] border-slate-200 text-[#0A141D]'
        }`}
      >
        {/* BARRA SUPERIOR (HEADER) */}
        {isStudioMobile ? (
          <div
            className={`px-3.5 pt-3 pb-2.5 border-b flex flex-col gap-2.5 shrink-0 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Linha 1: Voltar + Paciente + Botão Rápido de Estilo (abre Bottom Sheet) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Voltar"
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition active:scale-95 ${
                    darkMode
                      ? 'border-slate-800 bg-[#0A141D] text-slate-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold tracking-tight truncate">
                      <span className="text-[#00D296]">{pacienteForm.nome || 'Paciente'}</span>
                    </span>
                    {hasUnsavedChanges ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Alterações pendentes" />
                    ) : !isRecompiling ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D296] shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isSurgery ? 'Relatório Cirúrgico' : 'Laudo Ultrassom'}
                    {pacienteForm.especie ? ` • ${pacienteForm.especie}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileStyleSheetOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
                  (isSurgery ? temEstiloCustomizado : temEstiloUltrassomCustom)
                    ? 'bg-[#00D296]/15 border-[#00D296]/50 text-[#00D296]'
                    : darkMode
                    ? 'bg-[#0A141D] border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-[#00D296]" />
                <span>Estilo</span>
              </button>
            </div>

            {/* Linha 2: Controle Segmentado Nativo (PDF | Editar Texto) */}
            <div
              className={`p-1 rounded-xl border grid grid-cols-2 gap-1 ${
                darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'preview'
                    ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                    : darkMode
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'edit'
                    ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                    : darkMode
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Texto</span>
              </button>
            </div>

            {/* Linha 3 (somente na aba Editar Texto): Trilha horizontal de seções para o polegar */}
            {activeTab === 'edit' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { id: 'conteudo', label: isSurgery ? 'Seções' : 'Órgãos', icon: Layers },
                  ...(!isSurgery && imagensUltrassom.length > 0
                    ? [{ id: 'fotos', label: `Fotos (${imagensUltrassom.length})`, icon: Camera }]
                    : []),
                  { id: 'paciente', label: 'Paciente', icon: User },
                  { id: 'estilo', label: 'Padrões', icon: Palette },
                  { id: 'todos', label: 'Tudo', icon: LayoutGrid }
                ].map((nav) => {
                  const Icon = nav.icon;
                  const ativo = studioSection === nav.id;
                  return (
                    <button
                      key={nav.id}
                      type="button"
                      onClick={() => selecionarSecaoStudio(nav.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 border shrink-0 transition active:scale-95 ${
                        ativo
                          ? 'bg-[#00D296]/15 border-[#00D296]/50 text-[#00D296]'
                          : darkMode
                          ? 'bg-[#0A141D] border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{nav.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isStudioMode && (
              <button
                type="button"
                onClick={onClose}
                title="Voltar ao painel"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 transition shrink-0 ${
                  darkMode
                    ? 'border-slate-800 bg-[#0A141D] text-slate-300 hover:border-[#00D296] hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0D5C56]'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}
            <VetaroLogo size={24} dark={darkMode} showText={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight truncate">
                  {isStudioMode ? 'Vetaro Studio' : (isSurgery ? 'Relatório Cirúrgico' : 'Laudo de Ultrassonografia')} —{' '}
                  <span className="text-[#00D296]">{pacienteForm.nome || 'Paciente'}</span>
                </span>
                {isStudioMode && !hasUnsavedChanges && !isRecompiling && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30 items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Salvo
                  </span>
                )}
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Alterações pendentes
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {pacienteForm.especie} {pacienteForm.raca ? `• ${pacienteForm.raca}` : ''}{' '}
                {pacienteForm.peso ? `• Peso: ${pacienteForm.peso}` : ''}{' '}
                {pacienteForm.tutor ? `• Responsável: ${pacienteForm.tutor}` : ''}
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

            {isStudioMode && (
              <div className="hidden xl:flex items-center gap-1.5 pl-1 border-l border-slate-700/50">
                <button
                  type="button"
                  onClick={() => handleSalvarERecompilar()}
                  disabled={isRecompiling}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold border border-slate-700 bg-[#0A141D] text-slate-200 hover:border-[#00D296] hover:text-white transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#00D296] ${isRecompiling ? 'animate-spin' : ''}`} />
                  <span>{hasUnsavedChanges ? 'Salvar PDF' : 'Regerar'}</span>
                </button>
                {docxUrlLive && (
                  <a
                    href={docxUrlLive}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onToast && onToast('Arquivo Word (.docx) baixado com sucesso!')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-100 text-[#0A141D] hover:bg-slate-200'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 text-[#00D296]" />
                    <span>Word</span>
                  </a>
                )}
                {shareDocId && (
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition ${
                      darkMode
                        ? 'border-[#00D296]/40 bg-[#00D296]/10 text-[#00D296] hover:bg-[#00D296]/20'
                        : 'border-teal-300 bg-teal-50 text-[#0D5C56] hover:bg-teal-100'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
                {pdfUrlLive && (
                  <a
                    href={pdfUrlLive}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onToast && onToast('PDF baixado com sucesso!')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] inline-flex items-center gap-1.5 hover:brightness-110 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF</span>
                  </a>
                )}
              </div>
            )}

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
        )}

        {/* CORPO DO MODAL / STUDIO (CONTEÚDO DINÂMICO CONFORME ABA) */}
        <div
          ref={studioContainerRef}
          className={`flex-1 overflow-hidden relative flex ${
            (activeTab === 'split' || (isStudioMode && !isStudioMobile)) ? 'flex-row' : 'flex-col'
          }`}
        >
          {/* TRILHO LATERAL DO VETARO STUDIO (SOMENTE NOVA INTERFACE) */}
          {isStudioMode && (activeTab === 'edit' || activeTab === 'split') && (
            <aside
              className={`hidden md:flex w-[76px] shrink-0 border-r flex-col items-center py-4 gap-2 ${
                darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {[
                { id: 'paciente', label: 'Paciente', icon: User },
                { id: 'conteudo', label: isSurgery ? 'Seções' : 'Órgãos', icon: Layers },
                ...(!isSurgery && imagensUltrassom.length > 0
                  ? [{ id: 'fotos', label: `Fotos (${imagensUltrassom.length})`, icon: Camera }]
                  : []),
                { id: 'estilo', label: 'Estilo', icon: Palette },
                { id: 'todos', label: 'Tudo', icon: LayoutGrid }
              ].map((nav) => {
                const Icon = nav.icon;
                const ativo = studioSection === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => selecionarSecaoStudio(nav.id)}
                    className={`w-14 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition relative ${
                      ativo
                        ? darkMode
                          ? 'bg-[#0D3131] text-[#00D296]'
                          : 'bg-[#DDF7F0] text-[#0D5C56]'
                        : darkMode
                        ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {ativo && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#00D296]" />
                    )}
                    <Icon className="w-4 h-4" />
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </aside>
          )}

          {/* MODO EDITOR DE TEXTO / ÓRGÃOS (ESQUERDA NO MODO SPLIT) */}
          {(activeTab === 'edit' || activeTab === 'split') && (
            <div
              style={
                isStudioMode && activeTab === 'split'
                  ? { width: `${studioSplitPct}%` }
                  : undefined
              }
              className={`h-full overflow-y-auto p-4 sm:p-6 space-y-4 ${
                activeTab === 'split'
                  ? isStudioMode
                    ? 'shrink-0'
                    : 'w-1/2 border-r border-slate-800/80'
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
              {mostrarCardPaciente && (
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
                        {pacienteForm.nome || 'Não identificado'} • {pacienteForm.especie}
                        {pacienteForm.peso ? ` • Peso: ${pacienteForm.peso}` : ''} • Responsável:{' '}
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
                        Peso
                      </label>
                      <input
                        type="text"
                        value={pacienteForm.peso}
                        placeholder="Ex: 6 kg"
                        onChange={(e) => handlePacienteChange('peso', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode
                            ? 'bg-[#0A141D] border-slate-700 text-white focus:border-[#00D296]'
                            : 'bg-slate-50 border-slate-300 text-[#0A141D] focus:border-[#0D5C56]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Nome do Responsável
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

                    <div>
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
              )}

              {/* SEÇÃO ESPECÍFICA: CIRURGIA OU ULTRASSOM */}
              {isSurgery ? (
                /* FORMULÁRIO DE RELATÓRIO CIRÚRGICO */
                <div className="space-y-4">
                  {/* Card Colapsável: Diagramação & Estilo Exclusivo deste Relatório */}
                  {mostrarCardEstilo && (
                  <div
                    className={`rounded-2xl border transition ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      onClick={() => setEstiloCirurgiaAberto(!estiloCirurgiaAberto)}
                      className="px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer select-none gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center shrink-0">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-extrabold">
                              Diagramação & Estilo deste Relatório
                            </h4>
                            {temEstiloCustomizado ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/30">
                                Personalizado só neste relatório
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
                                Padrão das Configurações
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {estiloCirurgiaForm.fontFamily.split(',')[0]} • Corpo {estiloCirurgiaForm.fontSizeBody} • Título {estiloCirurgiaForm.fontSizeTitulo} • Espaço {estiloCirurgiaForm.paragraphSpacing}
                          </p>
                        </div>
                      </div>
                      {estiloCirurgiaAberto ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </div>

                    {estiloCirurgiaAberto && (
                      <div className="p-4 sm:p-5 border-t border-slate-800/60 space-y-4 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                          <p className="text-[11px] text-slate-400">
                            Ajustes feitos aqui valem <strong className="text-[#00D296]">apenas para este relatório</strong> e não alteram seu padrão salvo em Configurações.
                          </p>
                          {temEstiloCustomizado && (
                            <button
                              type="button"
                              onClick={handleResetarEstiloCirurgia}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                                darkMode
                                  ? 'border-slate-700 bg-[#0A141D] text-slate-300 hover:border-[#00D296] hover:text-[#00D296]'
                                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-[#0D5C56]'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Voltar ao Padrão</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Formato do Cabeçalho
                            </label>
                            <select
                              value={estiloCirurgiaForm.tipoCabecalho}
                              onChange={(e) => handleEstiloCirurgiaChange('tipoCabecalho', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="logo-esquerda-dados-direita">Logo à esquerda com dados à direita</option>
                              <option value="logo-centro">Logo centralizada no topo</option>
                              <option value="banner-superior">Banner superior colorido</option>
                              <option value="sem-logo-tipografico">Cabeçalho tipográfico (sem imagem)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Dados do Paciente
                            </label>
                            <select
                              value={estiloCirurgiaForm.tipoDadosPaciente}
                              onChange={(e) => handleEstiloCirurgiaChange('tipoDadosPaciente', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="duas-colunas-limpo">Duas colunas limpas</option>
                              <option value="tabela-zebrada">Tabela com fundo suave</option>
                              <option value="tabela-borda-simples">Tabela com bordas finas</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Estilo das Seções Cirúrgicas
                            </label>
                            <select
                              value={estiloCirurgiaForm.estiloSecoes}
                              onChange={(e) => handleEstiloCirurgiaChange('estiloSecoes', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="negrito-inline">Negrito inline clássico (SEÇÃO: texto)</option>
                              <option value="barra-lateral">Barra vertical colorida à esquerda</option>
                              <option value="tarja-colorida">Tarja sólida colorida por seção</option>
                              <option value="sublinhado">Título em caixa alta sublinhado</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Decoração do Título Principal
                            </label>
                            <select
                              value={estiloCirurgiaForm.decoracaoTitulo}
                              onChange={(e) => handleEstiloCirurgiaChange('decoracaoTitulo', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="nenhuma">Limpo (sem borda ou faixa)</option>
                              <option value="borda-inferior">Linha inferior colorida</option>
                              <option value="faixa-colorida">Faixa sólida na cor primária</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Posição da Assinatura
                            </label>
                            <select
                              value={estiloCirurgiaForm.posicaoAssinatura}
                              onChange={(e) => handleEstiloCirurgiaChange('posicaoAssinatura', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="centro">Centralizada</option>
                              <option value="direita">Alinhada à Direita</option>
                              <option value="esquerda">Alinhada à Esquerda</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Rótulo do Responsável
                            </label>
                            <select
                              value={estiloCirurgiaForm.rotuloResponsavel}
                              onChange={(e) => handleEstiloCirurgiaChange('rotuloResponsavel', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="Responsável">Responsável</option>
                              <option value="Tutor">Tutor</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Título Principal do Documento
                            </label>
                            <input
                              type="text"
                              value={estiloCirurgiaForm.tituloDocumento}
                              onChange={(e) => handleEstiloCirurgiaChange('tituloDocumento', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Subtítulo (opcional)
                            </label>
                            <input
                              type="text"
                              value={estiloCirurgiaForm.subtituloDocumento}
                              placeholder="Ex: Centro Cirúrgico Veterinário"
                              onChange={(e) => handleEstiloCirurgiaChange('subtituloDocumento', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Cor Primária
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={estiloCirurgiaForm.corPrimaria || '#1B365D'}
                                onChange={(e) => handleEstiloCirurgiaChange('corPrimaria', e.target.value)}
                                className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                              />
                              <span className="text-xs font-mono text-slate-400">{estiloCirurgiaForm.corPrimaria}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Cor Secundária
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={estiloCirurgiaForm.corSecundaria || '#4A777A'}
                                onChange={(e) => handleEstiloCirurgiaChange('corSecundaria', e.target.value)}
                                className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                              />
                              <span className="text-xs font-mono text-slate-400">{estiloCirurgiaForm.corSecundaria}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Fonte
                            </label>
                            <select
                              value={estiloCirurgiaForm.fontFamily}
                              onChange={(e) => handleEstiloCirurgiaChange('fontFamily', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {FONTES_CIRURGIA.map((f) => (
                                <option key={f} value={f}>{f.split(',')[0]}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Fonte do Cabeçalho
                            </label>
                            <select
                              value={estiloCirurgiaForm.fontSizeCabecalho || estiloCirurgiaForm.fontSizeBody || '11pt'}
                              onChange={(e) => handleEstiloCirurgiaChange('fontSizeCabecalho', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {TAMANHOS_FONTE_CORPO.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                              {estiloCirurgiaForm.fontSizeCabecalho && !TAMANHOS_FONTE_CORPO.includes(estiloCirurgiaForm.fontSizeCabecalho) && (
                                <option value={estiloCirurgiaForm.fontSizeCabecalho}>{estiloCirurgiaForm.fontSizeCabecalho} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Tamanho do Corpo
                            </label>
                            <select
                              value={estiloCirurgiaForm.fontSizeBody || '11pt'}
                              onChange={(e) => handleEstiloCirurgiaChange('fontSizeBody', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {TAMANHOS_FONTE_CORPO.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                              {estiloCirurgiaForm.fontSizeBody && !TAMANHOS_FONTE_CORPO.includes(estiloCirurgiaForm.fontSizeBody) && (
                                <option value={estiloCirurgiaForm.fontSizeBody}>{estiloCirurgiaForm.fontSizeBody} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Tamanho do Título
                            </label>
                            <select
                              value={estiloCirurgiaForm.fontSizeTitulo || '13.5pt'}
                              onChange={(e) => handleEstiloCirurgiaChange('fontSizeTitulo', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {TAMANHOS_FONTE_TITULO.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                              {estiloCirurgiaForm.fontSizeTitulo && !TAMANHOS_FONTE_TITULO.includes(estiloCirurgiaForm.fontSizeTitulo) && (
                                <option value={estiloCirurgiaForm.fontSizeTitulo}>{estiloCirurgiaForm.fontSizeTitulo} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Espaço entre Tópicos
                            </label>
                            <select
                              value={estiloCirurgiaForm.paragraphSpacing || '8pt'}
                              onChange={(e) => handleEstiloCirurgiaChange('paragraphSpacing', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {ESPACAMENTOS_TOPICOS.map((sp) => (
                                <option key={sp} value={sp}>
                                  {sp}
                                  {sp === '6pt' ? ' (Compacto)' : sp === '10pt' ? ' (Equilibrado)' : sp === '16pt' ? ' (Amplo)' : ''}
                                </option>
                              ))}
                              {estiloCirurgiaForm.paragraphSpacing && !ESPACAMENTOS_TOPICOS.includes(estiloCirurgiaForm.paragraphSpacing) && (
                                <option value={estiloCirurgiaForm.paragraphSpacing}>{estiloCirurgiaForm.paragraphSpacing} (Extraído)</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-800/40">
                          <label className="inline-flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={estiloCirurgiaForm.mostrarAssinaturaImagem !== false}
                              onChange={(e) => handleEstiloCirurgiaChange('mostrarAssinaturaImagem', e.target.checked)}
                              className="rounded border-slate-600 accent-[#00D296]"
                            />
                            <span className="text-slate-300">Exibir imagem da assinatura</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={estiloCirurgiaForm.mostrarAssinaturaTexto !== false}
                              onChange={(e) => handleEstiloCirurgiaChange('mostrarAssinaturaTexto', e.target.checked)}
                              className="rounded border-slate-600 accent-[#00D296]"
                            />
                            <span className="text-slate-300">Exibir nome e CRMV</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                  {mostrarCardConteudo && (
                  <>
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

                  <div className="flex items-center justify-between px-1 pt-1">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Seções do Relatório ({ordemSecoesCirurgia.length})
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <GripVertical className="w-3 h-3" />
                      Arraste ou use as setas para reposicionar
                    </span>
                  </div>

                  {ordemSecoesCirurgia.map((secaoKey, idx) => {
                    const metaSec = SECOES_CIRURGIA_META[secaoKey];
                    if (!metaSec) return null;
                    const isDragging = draggedSecaoCirIdx === idx;
                    const isDragOver = dragOverSecaoCirIdx === idx && draggedSecaoCirIdx !== null && draggedSecaoCirIdx !== idx;
                    return (
                      <div
                        key={secaoKey}
                        draggable
                        onDragStart={(e) => {
                          if (!dragSecaoCirPermitidoRef.current) {
                            e.preventDefault();
                            return;
                          }
                          setDraggedSecaoCirIdx(idx);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(idx));
                        }}
                        onDragOver={(e) => {
                          if (draggedSecaoCirIdx === null) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverSecaoCirIdx !== idx) setDragOverSecaoCirIdx(idx);
                        }}
                        onDragLeave={() => {
                          if (dragOverSecaoCirIdx === idx) setDragOverSecaoCirIdx(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedSecaoCirIdx !== null && draggedSecaoCirIdx !== idx) {
                            handleReordenarSecaoCirurgia(draggedSecaoCirIdx, idx);
                          }
                          setDraggedSecaoCirIdx(null);
                          setDragOverSecaoCirIdx(null);
                          dragSecaoCirPermitidoRef.current = false;
                        }}
                        onDragEnd={() => {
                          setDraggedSecaoCirIdx(null);
                          setDragOverSecaoCirIdx(null);
                          dragSecaoCirPermitidoRef.current = false;
                        }}
                        className={`p-4 sm:p-5 rounded-2xl border space-y-2.5 transition-all duration-150 ${
                          isDragging
                            ? 'opacity-50 scale-[0.99] ring-1 ring-[#00D296]/40 border-[#00D296]/50'
                            : isDragOver
                            ? 'border-[#00D296] ring-2 ring-[#00D296]/30 shadow-lg shadow-[#00D296]/10'
                            : darkMode
                            ? 'bg-[#0F1C26] border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        } ${isDragging || isDragOver ? (darkMode ? 'bg-[#0F1C26]' : 'bg-white') : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onMouseDown={() => { dragSecaoCirPermitidoRef.current = true; }}
                            onMouseUp={() => { dragSecaoCirPermitidoRef.current = false; }}
                            title="Arraste para reposicionar esta seção"
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing select-none"
                          >
                            <div
                              className={`p-1 -ml-1 rounded-lg transition shrink-0 ${
                                darkMode
                                  ? 'text-slate-500 hover:text-[#00D296] hover:bg-[#00D296]/10'
                                  : 'text-slate-400 hover:text-[#0D5C56] hover:bg-slate-100'
                              }`}
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <span className="w-5 h-5 rounded-full bg-[#00D296]/15 text-[#00D296] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <label className="text-xs font-extrabold uppercase text-[#00D296] cursor-grab active:cursor-grabbing truncate">
                              {metaSec.titulo}
                            </label>
                          </div>

                          <div
                            className={`inline-flex items-center rounded-lg border overflow-hidden shrink-0 ${
                              darkMode
                                ? 'bg-[#0A141D] border-slate-700/80'
                                : 'bg-slate-100 border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoverSecaoCirurgia(idx, 'cima')}
                              title="Subir seção"
                              className={`p-1.5 transition ${
                                idx === 0
                                  ? 'opacity-25 cursor-not-allowed text-slate-500'
                                  : darkMode
                                  ? 'text-slate-300 hover:bg-[#00D296]/15 hover:text-[#00D296]'
                                  : 'text-slate-600 hover:bg-[#00D296]/15 hover:text-[#0D5C56]'
                              }`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <div className={`w-px h-3.5 ${darkMode ? 'bg-slate-700/80' : 'bg-slate-200'}`} />
                            <button
                              type="button"
                              disabled={idx === ordemSecoesCirurgia.length - 1}
                              onClick={() => handleMoverSecaoCirurgia(idx, 'baixo')}
                              title="Descer seção"
                              className={`p-1.5 transition ${
                                idx === ordemSecoesCirurgia.length - 1
                                  ? 'opacity-25 cursor-not-allowed text-slate-500'
                                  : darkMode
                                  ? 'text-slate-300 hover:bg-[#00D296]/15 hover:text-[#00D296]'
                                  : 'text-slate-600 hover:bg-[#00D296]/15 hover:text-[#0D5C56]'
                              }`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={metaSec.rows}
                          value={cirurgiaForm[metaSec.campo] || ''}
                          onChange={(e) => handleCirurgiaChange(metaSec.campo, e.target.value)}
                          className={`w-full p-3 rounded-xl border text-xs leading-relaxed ${metaSec.extraClass} ${
                            darkMode
                              ? 'bg-[#0A141D] border-slate-700 text-slate-100 focus:border-[#00D296]'
                              : 'bg-slate-50 border-slate-300 text-[#0A141D] focus:border-[#0D5C56]'
                          }`}
                        />
                      </div>
                    );
                  })}

                  {/* 4. Edição de Legendas das Imagens Intraoperatórias (Página 2) */}
                  {fotosCirurgia.length > 0 && (
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                        darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-extrabold uppercase text-[#00D296] flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" />
                          <span>4. Legendas das Imagens Intraoperatórias ({fotosCirurgia.length})</span>
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Atualiza o PDF e o Word na página de registro fotográfico
                        </span>
                      </div>

                      <div className="space-y-3">
                        {fotosCirurgia.map((foto, idx) => (
                          <div
                            key={foto.nome || idx}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
                              darkMode
                                ? 'bg-[#0A141D] border-slate-800'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            {foto.url && (
                              <img
                                src={foto.url}
                                alt={`Figura ${idx + 1}`}
                                className="w-20 h-16 object-cover rounded-lg border border-slate-700/50 shrink-0 bg-slate-900"
                              />
                            )}
                            <div className="flex-1 w-full space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold text-[#00D296]">
                                  Figura {idx + 1}
                                </span>
                                <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  {foto.nome}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={foto.legenda || ''}
                                onChange={(e) => handleAlterarLegendaFoto(idx, e.target.value)}
                                placeholder={`Figura ${idx + 1} - Descreva a imagem intraoperatória...`}
                                className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${
                                  darkMode
                                    ? 'bg-[#0F1C26] border-slate-700 text-slate-100 focus:border-[#00D296]'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-[#0D5C56]'
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </div>
              ) : (
                /* LISTA DE ÓRGÃOS DO LAUDO DE ULTRASSOM */
                <div className="space-y-4">
                  {/* Card Colapsável: Diagramação & Estilo Exclusivo deste Laudo de Ultrassom */}
                  {mostrarCardEstilo && (
                  <div
                    className={`rounded-2xl border transition ${
                      darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      onClick={() => setEstiloUltrassomAberto(!estiloUltrassomAberto)}
                      className="px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer select-none gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center shrink-0">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-extrabold">
                              Diagramação & Estilo deste Laudo
                            </h4>
                            {temEstiloUltrassomCustom ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/30">
                                Personalizado só neste laudo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
                                Padrão das Configurações
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {estiloUltrassomForm.fontFamily.split(',')[0]} • Cabeçalho {estiloUltrassomForm.fontSizeCabecalho} • Corpo {estiloUltrassomForm.fontSizeBody} • Título {estiloUltrassomForm.fontSizeTitulo}
                          </p>
                        </div>
                      </div>
                      {estiloUltrassomAberto ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </div>

                    {estiloUltrassomAberto && (
                      <div className="p-4 sm:p-5 border-t border-slate-800/60 space-y-4 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                          <p className="text-[11px] text-slate-400">
                            Ajustes feitos aqui valem <strong className="text-[#00D296]">apenas para este laudo</strong> e não alteram seu padrão salvo em Configurações.
                          </p>
                          {temEstiloUltrassomCustom && (
                            <button
                              type="button"
                              onClick={handleResetarEstiloUltrassom}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                                darkMode
                                  ? 'border-slate-700 bg-[#0A141D] text-slate-300 hover:border-[#00D296] hover:text-[#00D296]'
                                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-[#0D5C56]'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Voltar ao Padrão</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Cor Primária
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={estiloUltrassomForm.corPrimaria || '#1B365D'}
                                onChange={(e) => handleEstiloUltrassomChange('corPrimaria', e.target.value)}
                                className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                              />
                              <span className="text-xs font-mono text-slate-400">{estiloUltrassomForm.corPrimaria}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Cor Secundária
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={estiloUltrassomForm.corSecundaria || '#4A777A'}
                                onChange={(e) => handleEstiloUltrassomChange('corSecundaria', e.target.value)}
                                className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                              />
                              <span className="text-xs font-mono text-slate-400">{estiloUltrassomForm.corSecundaria}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Fonte
                            </label>
                            <select
                              value={estiloUltrassomForm.fontFamily}
                              onChange={(e) => handleEstiloUltrassomChange('fontFamily', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {FONTES_CIRURGIA.map((f) => (
                                <option key={f} value={f}>{f.split(',')[0]}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Fonte do Cabeçalho
                            </label>
                            <select
                              value={estiloUltrassomForm.fontSizeCabecalho || '10pt'}
                              onChange={(e) => handleEstiloUltrassomChange('fontSizeCabecalho', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {TAMANHOS_FONTE_CORPO.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                              {estiloUltrassomForm.fontSizeCabecalho && !TAMANHOS_FONTE_CORPO.includes(estiloUltrassomForm.fontSizeCabecalho) && (
                                <option value={estiloUltrassomForm.fontSizeCabecalho}>{estiloUltrassomForm.fontSizeCabecalho} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Tamanho do Corpo
                            </label>
                            <select
                              value={estiloUltrassomForm.fontSizeBody || '11pt'}
                              onChange={(e) => handleEstiloUltrassomChange('fontSizeBody', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {TAMANHOS_FONTE_CORPO.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                              {estiloUltrassomForm.fontSizeBody && !TAMANHOS_FONTE_CORPO.includes(estiloUltrassomForm.fontSizeBody) && (
                                <option value={estiloUltrassomForm.fontSizeBody}>{estiloUltrassomForm.fontSizeBody} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Tamanho do Título
                            </label>
                            <select
                              value={estiloUltrassomForm.fontSizeTitulo || '14pt'}
                              onChange={(e) => handleEstiloUltrassomChange('fontSizeTitulo', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {TAMANHOS_FONTE_TITULO.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                              {estiloUltrassomForm.fontSizeTitulo && !TAMANHOS_FONTE_TITULO.includes(estiloUltrassomForm.fontSizeTitulo) && (
                                <option value={estiloUltrassomForm.fontSizeTitulo}>{estiloUltrassomForm.fontSizeTitulo} (Extraído)</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Espaço entre Categorias (Órgãos)
                            </label>
                            <select
                              value={estiloUltrassomForm.paragraphSpacing || '8pt'}
                              onChange={(e) => handleEstiloUltrassomChange('paragraphSpacing', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {ESPACAMENTOS_TOPICOS.map((sp) => (
                                <option key={sp} value={sp}>
                                  {sp}
                                  {sp === '6pt' ? ' (Compacto)' : sp === '10pt' ? ' (Equilibrado)' : sp === '16pt' ? ' (Amplo)' : ''}
                                </option>
                              ))}
                              {estiloUltrassomForm.paragraphSpacing && !ESPACAMENTOS_TOPICOS.includes(estiloUltrassomForm.paragraphSpacing) && (
                                <option value={estiloUltrassomForm.paragraphSpacing}>{estiloUltrassomForm.paragraphSpacing} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Espaçamento entre Linhas
                            </label>
                            <select
                              value={String(estiloUltrassomForm.lineHeight || '1.35')}
                              onChange={(e) => handleEstiloUltrassomChange('lineHeight', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              {['1.15', '1.2', '1.25', '1.3', '1.35', '1.4', '1.5', '1.6'].map((lh) => (
                                <option key={lh} value={lh}>{lh}</option>
                              ))}
                              {estiloUltrassomForm.lineHeight && !['1.15', '1.2', '1.25', '1.3', '1.35', '1.4', '1.5', '1.6'].includes(String(estiloUltrassomForm.lineHeight)) && (
                                <option value={estiloUltrassomForm.lineHeight}>{estiloUltrassomForm.lineHeight} (Extraído)</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                              Quebra de Página
                            </label>
                            <select
                              value={estiloUltrassomForm.paginacaoTexto || 'preencher'}
                              onChange={(e) => handleEstiloUltrassomChange('paginacaoTexto', e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            >
                              <option value="preencher">Preencher máximo da página</option>
                              <option value="equilibrar">Equilibrar entre páginas</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Sup.</label>
                            <input
                              type="text"
                              value={estiloUltrassomForm.marginTop || '20mm'}
                              onChange={(e) => handleEstiloUltrassomChange('marginTop', e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Inf.</label>
                            <input
                              type="text"
                              value={estiloUltrassomForm.marginBottom || '20mm'}
                              onChange={(e) => handleEstiloUltrassomChange('marginBottom', e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Esq.</label>
                            <input
                              type="text"
                              value={estiloUltrassomForm.marginLeft || '15mm'}
                              onChange={(e) => handleEstiloUltrassomChange('marginLeft', e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Dir.</label>
                            <input
                              type="text"
                              value={estiloUltrassomForm.marginRight || '15mm'}
                              onChange={(e) => handleEstiloUltrassomChange('marginRight', e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-xl border font-bold text-xs ${
                                darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-800/40">
                          <label className="inline-flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={estiloUltrassomForm.mostrarAssinaturaImagem !== false}
                              onChange={(e) => handleEstiloUltrassomChange('mostrarAssinaturaImagem', e.target.checked)}
                              className="rounded border-slate-600 accent-[#00D296]"
                            />
                            <span className="text-slate-300">Exibir imagem da assinatura</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={estiloUltrassomForm.mostrarAssinaturaTexto !== false}
                              onChange={(e) => handleEstiloUltrassomChange('mostrarAssinaturaTexto', e.target.checked)}
                              className="rounded border-slate-600 accent-[#00D296]"
                            />
                            <span className="text-slate-300">Exibir nome e CRMV</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                  {mostrarCardConteudo && (
                  <>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Órgãos Avaliados ({laudoForm.length})
                      </h4>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                        <GripVertical className="w-3 h-3" />
                        Arraste para reordenar
                      </span>
                    </div>

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
                  {laudoForm.map((item, idx) => {
                    const isDragging = draggedOrgaoIdx === idx;
                    const isDragOver = dragOverOrgaoIdx === idx && draggedOrgaoIdx !== null && draggedOrgaoIdx !== idx;
                    return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => {
                        if (!dragOrgaoPermitidoRef.current) {
                          e.preventDefault();
                          return;
                        }
                        setDraggedOrgaoIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragOver={(e) => {
                        if (draggedOrgaoIdx === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverOrgaoIdx !== idx) setDragOverOrgaoIdx(idx);
                      }}
                      onDragLeave={() => {
                        if (dragOverOrgaoIdx === idx) setDragOverOrgaoIdx(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedOrgaoIdx !== null && draggedOrgaoIdx !== idx) {
                          handleReordenarOrgao(draggedOrgaoIdx, idx);
                        }
                        setDraggedOrgaoIdx(null);
                        setDragOverOrgaoIdx(null);
                        dragOrgaoPermitidoRef.current = false;
                      }}
                      onDragEnd={() => {
                        setDraggedOrgaoIdx(null);
                        setDragOverOrgaoIdx(null);
                        dragOrgaoPermitidoRef.current = false;
                      }}
                      className={`p-4 rounded-2xl border transition-all duration-150 group ${
                        isDragging
                          ? 'opacity-50 scale-[0.99] ring-1 ring-[#00D296]/40 border-[#00D296]/50'
                          : isDragOver
                          ? 'border-[#00D296] ring-2 ring-[#00D296]/30 shadow-lg shadow-[#00D296]/10'
                          : darkMode
                          ? 'bg-[#0F1C26] border-slate-800/90 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      } ${isDragging || isDragOver ? (darkMode ? 'bg-[#0F1C26]' : 'bg-white') : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            onMouseDown={() => { dragOrgaoPermitidoRef.current = true; }}
                            onMouseUp={() => { dragOrgaoPermitidoRef.current = false; }}
                            title="Arraste para reorganizar"
                            className={`p-1.5 -ml-1 rounded-lg cursor-grab active:cursor-grabbing transition shrink-0 ${
                              darkMode
                                ? 'text-slate-500 hover:text-[#00D296] hover:bg-[#00D296]/10'
                                : 'text-slate-400 hover:text-[#0D5C56] hover:bg-slate-100'
                            }`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="w-5 h-5 rounded-full bg-[#00D296]/15 text-[#00D296] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.orgao}
                            onChange={(e) => handleAlterarOrgao(idx, 'orgao', e.target.value)}
                            className={`font-extrabold text-xs uppercase tracking-wide px-2 py-0.5 rounded-lg border border-transparent focus:border-[#00D296] bg-transparent min-w-0 flex-1 ${
                              darkMode ? 'text-white' : 'text-[#0A141D]'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div
                            className={`inline-flex items-center rounded-lg border overflow-hidden ${
                              darkMode
                                ? 'bg-[#0A141D] border-slate-700/80'
                                : 'bg-slate-100 border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoverOrgao(idx, 'cima')}
                              title="Subir posição"
                              className={`p-1.5 transition ${
                                idx === 0
                                  ? 'opacity-25 cursor-not-allowed text-slate-500'
                                  : darkMode
                                  ? 'text-slate-300 hover:bg-[#00D296]/15 hover:text-[#00D296]'
                                  : 'text-slate-600 hover:bg-[#00D296]/15 hover:text-[#0D5C56]'
                              }`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <div className={`w-px h-3.5 ${darkMode ? 'bg-slate-700/80' : 'bg-slate-200'}`} />
                            <button
                              type="button"
                              disabled={idx === laudoForm.length - 1}
                              onClick={() => handleMoverOrgao(idx, 'baixo')}
                              title="Descer posição"
                              className={`p-1.5 transition ${
                                idx === laudoForm.length - 1
                                  ? 'opacity-25 cursor-not-allowed text-slate-500'
                                  : darkMode
                                  ? 'text-slate-300 hover:bg-[#00D296]/15 hover:text-[#00D296]'
                                  : 'text-slate-600 hover:bg-[#00D296]/15 hover:text-[#0D5C56]'
                              }`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverOrgao(idx)}
                            title="Remover este órgão do laudo"
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition"
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
                    );
                  })}
                  </>
                  )}

                  {/* Reorganizador de Imagens do Exame (Ultrassom — Drag & Drop + Setas) */}
                  {mostrarCardFotos && (
                    <div
                      className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 transition ${
                        darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#00D296]/15 text-[#00D296] flex items-center justify-center shrink-0">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold">
                              Ordem das Imagens no PDF ({imagensUltrassom.length})
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Arraste as capturas ou use as setas para ajustar a sequência antes de baixar o PDF.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {imagensUltrassom.map((img, idx) => {
                          const isDragging = dragFotoUsIdx === idx;
                          const isDragOver = dragOverFotoUsIdx === idx && dragFotoUsIdx !== null && dragFotoUsIdx !== idx;
                          return (
                            <div
                              key={img.id || img.nome}
                              draggable
                              onDragStart={() => setDragFotoUsIdx(idx)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverFotoUsIdx !== idx) setDragOverFotoUsIdx(idx);
                              }}
                              onDragLeave={() => {
                                if (dragOverFotoUsIdx === idx) setDragOverFotoUsIdx(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropFotoUs(dragFotoUsIdx, idx);
                                setDragFotoUsIdx(null);
                                setDragOverFotoUsIdx(null);
                              }}
                              onDragEnd={() => {
                                setDragFotoUsIdx(null);
                                setDragOverFotoUsIdx(null);
                              }}
                              className={`rounded-xl border overflow-hidden transition cursor-grab active:cursor-grabbing ${
                                isDragging
                                  ? 'opacity-45 border-[#00D296] scale-[0.98]'
                                  : isDragOver
                                  ? 'border-[#00D296] ring-2 ring-[#00D296]/40'
                                  : darkMode
                                  ? 'bg-[#0A141D] border-slate-800 hover:border-slate-600'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <div className="relative aspect-[4/3] bg-black overflow-hidden">
                                <img
                                  src={img.url}
                                  alt={`Captura ${idx + 1}`}
                                  loading="lazy"
                                  className="w-full h-full object-contain pointer-events-none select-none"
                                />
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#0A141D]/85 text-[#00D296] border border-[#00D296]/40">
                                  #{idx + 1}
                                </span>
                                <span className="absolute top-1.5 right-1.5 p-1 rounded-md bg-[#0A141D]/75 text-slate-300">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                              </div>
                              <div className="px-2.5 py-1.5 flex items-center justify-between gap-1 border-t border-slate-800/60">
                                <span className="text-[10px] font-bold text-slate-400 truncate">
                                  Foto {idx + 1}
                                </span>
                                <div className="inline-flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoverFotoUs(idx, 'antes')}
                                    title="Mover para antes"
                                    className="px-2 py-1 rounded-lg text-[11px] font-extrabold border border-slate-700/80 text-slate-300 hover:border-[#00D296] hover:text-[#00D296] disabled:opacity-25 disabled:cursor-not-allowed transition"
                                  >
                                    ←
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === imagensUltrassom.length - 1}
                                    onClick={() => handleMoverFotoUs(idx, 'depois')}
                                    title="Mover para depois"
                                    className="px-2 py-1 rounded-lg text-[11px] font-extrabold border border-slate-700/80 text-slate-300 hover:border-[#00D296] hover:text-[#00D296] disabled:opacity-25 disabled:cursor-not-allowed transition"
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DIVISOR ARRASTÁVEL DO STUDIO (RESIZABLE SPLIT) */}
          {isStudioMode && activeTab === 'split' && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSplit(true);
              }}
              title="Arraste para redimensionar editor e PDF"
              className={`w-1.5 shrink-0 cursor-col-resize flex items-center justify-center transition-colors group ${
                isResizingSplit
                  ? 'bg-[#00D296]'
                  : darkMode
                  ? 'bg-slate-800 hover:bg-[#00D296]/70'
                  : 'bg-slate-200 hover:bg-[#00D296]/70'
              }`}
            >
              <div className="w-0.5 h-10 rounded-full bg-slate-500/60 group-hover:bg-white" />
            </div>
          )}

          {/* MODO PREVIEW REALISTA DO PDF (DIREITA NO MODO SPLIT OU TELA CHEIA NO PREVIEW) */}
          {(activeTab === 'preview' || activeTab === 'split') && (
            <div
              className={`h-full min-h-0 flex flex-col bg-slate-900 ${
                activeTab === 'split' ? (isStudioMode ? 'flex-1 min-w-0' : 'w-1/2') : 'w-full'
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
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#00D296] shrink-0" />
                      <span className="text-[11px] truncate">
                        Documento Oficial ({pacienteForm.nome || 'Paciente'})
                      </span>
                      {isRecompiling && (
                        <span className="text-[10px] font-bold text-[#00D296] animate-pulse shrink-0">
                          Atualizando PDF...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoAtualizarPdf((prev) => !prev)}
                        title="Atualizar o PDF automaticamente ao alterar campos ou estilos"
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition inline-flex items-center gap-1 ${
                          autoAtualizarPdf
                            ? 'border-[#00D296]/40 bg-[#00D296]/15 text-[#00D296]'
                            : 'border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${isRecompiling ? 'animate-spin' : ''}`} />
                        <span>Auto PDF: {autoAtualizarPdf ? 'ON' : 'OFF'}</span>
                      </button>
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
                    {isResizingSplit && <div className="absolute inset-0 z-20 cursor-col-resize" />}
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

        {/* BOTTOM SHEET MOBILE: DIAGRAMAÇÃO & ESTILO DESTE LAUDO (SOMENTE STUDIO MOBILE) */}
        {isStudioMobile && mobileStyleSheetOpen && (
          <div
            onClick={() => setMobileStyleSheetOpen(false)}
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-h-[82vh] rounded-t-3xl border-t flex flex-col overflow-hidden shadow-2xl ${
                darkMode
                  ? 'bg-[#0F1C26] border-slate-700/80 text-white'
                  : 'bg-white border-slate-200 text-[#0A141D]'
              }`}
            >
              {/* Alça (drag handle) */}
              <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                <span className="w-10 h-1 rounded-full bg-slate-500/40" />
              </div>

              {/* Cabeçalho do Bottom Sheet */}
              <div className="px-4 py-2.5 border-b border-slate-700/40 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#00D296]/15 text-[#00D296] flex items-center justify-center shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold truncate">Estilo deste Laudo</h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      Vale só para este documento (não muda o padrão)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileStyleSheetOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white"
                  aria-label="Fechar ajustes de estilo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Controles Rápidos */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {isSurgery ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Fonte</label>
                        <select
                          value={estiloCirurgiaForm.fontFamily}
                          onChange={(e) => handleEstiloCirurgiaChange('fontFamily', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {FONTES_CIRURGIA.map((f) => (
                            <option key={f} value={f}>{f.split(',')[0]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Corpo</label>
                        <select
                          value={estiloCirurgiaForm.fontSizeBody}
                          onChange={(e) => handleEstiloCirurgiaChange('fontSizeBody', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {TAMANHOS_FONTE_CORPO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Título</label>
                        <select
                          value={estiloCirurgiaForm.fontSizeTitulo}
                          onChange={(e) => handleEstiloCirurgiaChange('fontSizeTitulo', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {TAMANHOS_FONTE_TITULO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Cabeçalho</label>
                        <select
                          value={estiloCirurgiaForm.fontSizeCabecalho}
                          onChange={(e) => handleEstiloCirurgiaChange('fontSizeCabecalho', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {TAMANHOS_FONTE_CORPO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Espaço Tópicos</label>
                        <select
                          value={estiloCirurgiaForm.paragraphSpacing}
                          onChange={(e) => handleEstiloCirurgiaChange('paragraphSpacing', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {ESPACAMENTOS_TOPICOS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <label className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border cursor-pointer ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="font-bold text-[11px]">Imagem Assinatura</span>
                        <input
                          type="checkbox"
                          checked={estiloCirurgiaForm.mostrarAssinaturaImagem !== false}
                          onChange={(e) => handleEstiloCirurgiaChange('mostrarAssinaturaImagem', e.target.checked)}
                          className="accent-[#00D296] w-4 h-4"
                        />
                      </label>
                      <label className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border cursor-pointer ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="font-bold text-[11px]">Nome + CRMV</span>
                        <input
                          type="checkbox"
                          checked={estiloCirurgiaForm.mostrarAssinaturaTexto !== false}
                          onChange={(e) => handleEstiloCirurgiaChange('mostrarAssinaturaTexto', e.target.checked)}
                          className="accent-[#00D296] w-4 h-4"
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Fonte</label>
                        <select
                          value={estiloUltrassomForm.fontFamily}
                          onChange={(e) => handleEstiloUltrassomChange('fontFamily', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {FONTES_CIRURGIA.map((f) => (
                            <option key={f} value={f}>{f.split(',')[0]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Corpo</label>
                        <select
                          value={estiloUltrassomForm.fontSizeBody}
                          onChange={(e) => handleEstiloUltrassomChange('fontSizeBody', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {TAMANHOS_FONTE_CORPO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Título</label>
                        <select
                          value={estiloUltrassomForm.fontSizeTitulo}
                          onChange={(e) => handleEstiloUltrassomChange('fontSizeTitulo', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {TAMANHOS_FONTE_TITULO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Cabeçalho</label>
                        <select
                          value={estiloUltrassomForm.fontSizeCabecalho}
                          onChange={(e) => handleEstiloUltrassomChange('fontSizeCabecalho', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {TAMANHOS_FONTE_CORPO.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Espaço Órgãos</label>
                        <select
                          value={estiloUltrassomForm.paragraphSpacing}
                          onChange={(e) => handleEstiloUltrassomChange('paragraphSpacing', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          {ESPACAMENTOS_TOPICOS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Quebra de Página</label>
                        <select
                          value={estiloUltrassomForm.paginacaoTexto || 'preencher'}
                          onChange={(e) => handleEstiloUltrassomChange('paginacaoTexto', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border font-bold text-xs ${
                            darkMode ? 'bg-[#0A141D] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-[#0A141D]'
                          }`}
                        >
                          <option value="preencher">Preencher máximo por página</option>
                          <option value="equilibrar">Equilibrar conteúdo entre páginas</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <label className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border cursor-pointer ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="font-bold text-[11px]">Imagem Assinatura</span>
                        <input
                          type="checkbox"
                          checked={estiloUltrassomForm.mostrarAssinaturaImagem !== false}
                          onChange={(e) => handleEstiloUltrassomChange('mostrarAssinaturaImagem', e.target.checked)}
                          className="accent-[#00D296] w-4 h-4"
                        />
                      </label>
                      <label className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border cursor-pointer ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="font-bold text-[11px]">Nome + CRMV</span>
                        <input
                          type="checkbox"
                          checked={estiloUltrassomForm.mostrarAssinaturaTexto !== false}
                          onChange={(e) => handleEstiloUltrassomChange('mostrarAssinaturaTexto', e.target.checked)}
                          className="accent-[#00D296] w-4 h-4"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Rodapé do Bottom Sheet */}
              <div className="px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] border-t border-slate-700/40 flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => (isSurgery ? handleResetarEstiloCirurgia() : handleResetarEstiloUltrassom())}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 shrink-0 ${
                    darkMode
                      ? 'border-slate-700 bg-[#0A141D] text-slate-300'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileStyleSheetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] shadow-sm active:scale-[0.98] transition"
                >
                  Aplicar e Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (FOOTER / ACTIONS) — no Studio Mobile vira barra fixa ergonômica de polegar */}
        {isStudioMobile ? (
          <div
            className={`px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t flex items-center gap-2 shrink-0 ${
              darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={handleSalvarERecompilar}
              disabled={isRecompiling}
              className={`flex-1 min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                isRecompiling
                  ? 'bg-slate-700 text-slate-400 cursor-wait'
                  : hasUnsavedChanges
                  ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] ring-2 ring-[#00D296]/40'
                  : darkMode
                  ? 'bg-[#0F1C26] border border-slate-700 text-slate-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-800'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecompiling ? 'animate-spin' : 'text-[#00D296]'}`} />
              <span>{isRecompiling ? 'Gerando...' : hasUnsavedChanges ? 'Salvar PDF' : 'Regerar'}</span>
            </button>

            {docxUrlLive && (
              <a
                href={docxUrlLive}
                target="_blank"
                rel="noreferrer"
                onClick={() => onToast && onToast('Arquivo Word (.docx) baixado com sucesso!')}
                className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800/90 text-slate-100'
                    : 'border-slate-200 bg-slate-100 text-[#0A141D]'
                }`}
              >
                <FileCheck className="w-4 h-4 text-[#00D296]" />
                <span>Word</span>
              </a>
            )}

            {shareDocId && (
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                aria-label="Compartilhar no WhatsApp"
                className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                  darkMode
                    ? 'border-[#00D296]/40 bg-[#00D296]/15 text-[#00D296]'
                    : 'border-teal-300 bg-teal-50 text-[#0D5C56]'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar</span>
              </button>
            )}

            {pdfUrlLive && (
              <a
                href={pdfUrlLive}
                target="_blank"
                rel="noreferrer"
                onClick={() => onToast && onToast('PDF baixado com sucesso!')}
                className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF</span>
              </a>
            )}
          </div>
        ) : (
        <div
          className={`px-4 sm:px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isStudioMode ? 'xl:hidden ' : ''
          }${
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

            {shareDocId && (
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition ${
                  darkMode
                    ? 'border-[#00D296]/40 bg-[#00D296]/10 text-[#00D296] hover:bg-[#00D296]/20'
                    : 'border-teal-300 bg-teal-50 text-[#0D5C56] hover:bg-teal-100'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
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
        )}
      </div>

      <ShareReportModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        tipo={shareTipo}
        documentoId={shareDocId}
        pacienteNome={pacienteForm?.nome || report.paciente?.nome || report.patient || 'Paciente'}
        pacienteEspecie={pacienteForm?.especie || report.paciente?.especie || ''}
        tutorNome={pacienteForm?.tutor || report.paciente?.tutor || report.tutor || ''}
        procedimento={cirurgiaForm?.procedimento || report.cirurgia?.procedimento || ''}
        darkMode={darkMode}
        onToast={onToast}
      />
    </div>
  );
}
