import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  RotateCcw,
  Palette,
  Layers,
  X,
  Stethoscope,
  FileUp,
  Eye,
  Layout,
  Camera,
  Columns,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

const FONTES_DISPONIVEIS = [
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

const ROTULOS_PADRAO = {
  data: 'DATA DO PROCEDIMENTO CIRÚRGICO',
  procedimento: 'PROCEDIMENTO',
  diagnostico: 'DIAGNÓSTICO PRÉ-CIRÚRGICO',
  descricao: 'DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO',
  evolucao: 'EVOLUÇÃO E CONSIDERAÇÕES'
};

export default function EstiloCirurgiaTab({
  darkMode,
  isMobileLayout,
  onToast,
  userProfile,
  setUserProfile
}) {
  const fileInputRef = useRef(null);

  const [perfilDb, setPerfilDb] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [arquivosPdfs, setArquivosPdfs] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [etapaAnalise, setEtapaAnalise] = useState('');

  const [perfilEditando, setPerfilEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [redefinindo, setRedefinindo] = useState(false);
  const [abaVisualAtiva, setAbaVisualAtiva] = useState('design'); // 'design', 'redacao', 'preview'
  const [modoSplitPdf, setModoSplitPdf] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [gerandoPdfPreview, setGerandoPdfPreview] = useState(false);
  const [erroPdfPreview, setErroPdfPreview] = useState('');
  const previewAbortRef = useRef(0);
  const previewControllerRef = useRef(null);

  const montarEstadoEdicao = (origem, usuarioFallback, layoutFallback) => {
    const tVisual = origem.templateVisual || origem.layoutDetectado || {};
    const rotulos = {
      ...ROTULOS_PADRAO,
      ...(tVisual.rotulosSecoes || {})
    };
    return {
      nomeDetectado: origem.nomeDetectado || usuarioFallback?.nome || userProfile?.name || '',
      crmvDetectado: origem.crmvDetectado || usuarioFallback?.crmv || userProfile?.crmv || '',
      clinicaDetectada: origem.clinicaDetectada || usuarioFallback?.nomeClinica || userProfile?.clinicName || '',
      layoutDetectado: origem.layoutDetectado || layoutFallback || {},
      templateVisual: {
        ...tVisual,
        tipoCabecalho: tVisual.tipoCabecalho || 'logo-esquerda-dados-direita',
        tipoDadosPaciente: tVisual.tipoDadosPaciente || 'duas-colunas-limpo',
        tituloDocumento: tVisual.tituloDocumento || 'RELATÓRIO CIRÚRGICO',
        subtituloDocumento: tVisual.subtituloDocumento || '',
        alinhamentoTitulo: tVisual.alinhamentoTitulo || 'center',
        decoracaoTitulo: tVisual.decoracaoTitulo || 'nenhuma',
        estiloSecoes: tVisual.estiloSecoes || 'negrito-inline',
        rotuloResponsavel: tVisual.rotuloResponsavel || 'Responsável',
        rotulosSecoes: rotulos,
        tituloRegistroFotografico: tVisual.tituloRegistroFotografico || 'REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO',
        legendaPadraoFoto: tVisual.legendaPadraoFoto || 'Registro fotográfico intraoperatório / peça cirúrgica',
        posicaoAssinatura: tVisual.posicaoAssinatura || 'centro',
        linhaAssinatura: tVisual.linhaAssinatura !== undefined ? Boolean(tVisual.linhaAssinatura) : false,
        mostrarAssinaturaImagem: tVisual.mostrarAssinaturaImagem !== undefined ? Boolean(tVisual.mostrarAssinaturaImagem) : true,
        mostrarAssinaturaTexto: tVisual.mostrarAssinaturaTexto !== undefined ? Boolean(tVisual.mostrarAssinaturaTexto) : true,
        textoAvisoLegal: tVisual.textoAvisoLegal || '',
        rodapeContato: tVisual.rodapeContato || '',
        corPrimaria: tVisual.corPrimaria || layoutFallback?.cor_primaria || '#1B365D',
        corSecundaria: tVisual.corSecundaria || layoutFallback?.cor_secundaria || '#4A777A',
        corFundoBlocos: tVisual.corFundoBlocos || '#F8FAFC',
        corBordaTabelas: tVisual.corBordaTabelas || '#E2E8F0',
        fontFamily: tVisual.fontFamily || layoutFallback?.font_family || 'Calibri, sans-serif',
        fontSizeBody: tVisual.fontSizeBody || layoutFallback?.font_size_body || '11pt',
        fontSizeCabecalho: tVisual.fontSizeCabecalho || layoutFallback?.font_size_cabecalho || tVisual.fontSizeBody || layoutFallback?.font_size_body || '11pt',
        fontSizeTitulo: tVisual.fontSizeTitulo || layoutFallback?.font_size_titulo || '13.5pt',
        marginTop: tVisual.marginTop || layoutFallback?.margin_top || '18mm',
        marginBottom: tVisual.marginBottom || layoutFallback?.margin_bottom || '18mm',
        marginLeft: tVisual.marginLeft || layoutFallback?.margin_left || '20mm',
        marginRight: tVisual.marginRight || layoutFallback?.margin_right || '20mm',
        lineHeight: tVisual.lineHeight || layoutFallback?.line_height || '1.35',
        paragraphSpacing: tVisual.paragraphSpacing || layoutFallback?.paragraph_spacing || '8pt'
      },
      ordemSecoes: Array.isArray(origem.ordemSecoes) && origem.ordemSecoes.length > 0
        ? [...origem.ordemSecoes]
        : Object.values(rotulos),
      estiloRedacao: {
        frasePadraoAntissepsia: origem.estiloRedacao?.frasePadraoAntissepsia || '',
        frasePadraoEvolucao: origem.estiloRedacao?.frasePadraoEvolucao || '',
        pessoaVerbal: origem.estiloRedacao?.pessoaVerbal || 'impessoal / 3ª pessoa',
        detalhamentoFios: origem.estiloRedacao?.detalhamentoFios || 'detalhado por planos anatômicos'
      },
      vocabularioPreferido: origem.vocabularioPreferido || {},
      observacoesEstilo: origem.observacoesEstilo || '',
      atualizarUsuarioCrmv: true,
      atualizarUsuarioClinica: true,
      atualizarUsuarioNome: false,
      amostras: origem.arquivosAmostras || origem.amostras || []
    };
  };

  const carregarPerfil = async () => {
    setCarregando(true);
    try {
      const res = await api.getPerfilCirurgico();
      if (res && res.sucesso) {
        setPerfilDb(res.perfil);
        if (res.perfil && res.perfil.ativo) {
          setPerfilEditando(montarEstadoEdicao(res.perfil, res.usuario, res.layout));
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar perfil cirúrgico:', err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, []);

  const gerarPreviewPdfAoVivo = async (perfilAtual) => {
    const alvo = perfilAtual || perfilEditando;
    if (!alvo) return;
    const reqId = ++previewAbortRef.current;
    if (previewControllerRef.current) {
      previewControllerRef.current.abort();
    }
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setGerandoPdfPreview(true);
    setErroPdfPreview('');
    try {
      const blob = await api.previewPadraoCirurgia({
        nomeDetectado: alvo.nomeDetectado,
        crmvDetectado: alvo.crmvDetectado,
        clinicaDetectada: alvo.clinicaDetectada,
        templateVisual: alvo.templateVisual,
        estiloRedacao: alvo.estiloRedacao,
        ordemSecoes: alvo.ordemSecoes
      }, { signal: controller.signal });
      if (reqId !== previewAbortRef.current) return;
      const novaUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl((antiga) => {
        if (antiga) {
          setTimeout(() => URL.revokeObjectURL(antiga), 2000);
        }
        return novaUrl;
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (reqId === previewAbortRef.current) {
        setErroPdfPreview(err.message || 'Falha ao gerar pré-visualização PDF.');
      }
    } finally {
      if (reqId === previewAbortRef.current) {
        setGerandoPdfPreview(false);
      }
    }
  };

  useEffect(() => {
    if (!perfilEditando) return;
    if (!modoSplitPdf && abaVisualAtiva !== 'preview') return;
    const timer = setTimeout(() => {
      gerarPreviewPdfAoVivo(perfilEditando);
    }, 1000);
    return () => clearTimeout(timer);
  }, [perfilEditando, modoSplitPdf, abaVisualAtiva]);

  useEffect(() => {
    return () => {
      if (previewControllerRef.current) {
        previewControllerRef.current.abort();
      }
      setPdfPreviewUrl((antiga) => {
        if (antiga) URL.revokeObjectURL(antiga);
        return '';
      });
    };
  }, []);

  const formatarTamanho = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleSelecionarArquivos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const pdfsValidos = [];
    let ignorados = 0;

    for (const f of files) {
      const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf';
      if (!isPdf) {
        ignorados++;
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        if (onToast) onToast(`O arquivo "${f.name}" excede o limite de 15MB.`);
        continue;
      }
      pdfsValidos.push(f);
    }

    if (ignorados > 0 && onToast) {
      onToast(`${ignorados} arquivo(s) foram ignorados porque não são PDFs.`);
    }

    const total = [...arquivosPdfs, ...pdfsValidos];
    if (total.length > 10) {
      setArquivosPdfs(total.slice(0, 10));
      if (onToast) onToast('Limite de 10 PDFs atingido.');
    } else {
      setArquivosPdfs(total);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoverArquivo = (index) => {
    setArquivosPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalisarPdfs = async () => {
    if (arquivosPdfs.length === 0) {
      if (onToast) onToast('Selecione pelo menos 1 relatório cirúrgico em PDF.');
      return;
    }

    setAnalisando(true);
    setEtapaAnalise('Enviando relatórios cirúrgicos e iniciando análise visual com IA...');

    try {
      const formData = new FormData();
      arquivosPdfs.forEach((file) => formData.append('pdfs', file));

      const timer1 = setTimeout(() => {
        setEtapaAnalise('Identificando cabeçalho, logotipo, paleta de cores, margens e seções cirúrgicas...');
      }, 3200);

      const timer2 = setTimeout(() => {
        setEtapaAnalise('Mapeando estilo de redação técnica, antissepsia, síntese e registro fotográfico...');
      }, 7000);

      const res = await api.aprenderPadraoCirurgia(formData);
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res && res.sucesso && res.perfilDetectado) {
        const estado = montarEstadoEdicao(res.perfilDetectado, userProfile, res.perfilDetectado.layoutDetectado);
        setPerfilEditando(estado);

        const ativos = res.perfilDetectado.templateVisual?.ativosVisuais;
        if (setUserProfile && (ativos?.headerLogoUrl || ativos?.assinaturaUrl)) {
          setUserProfile((prev) => {
            const temLogoManual = typeof prev?.logoUrl === 'string' && prev.logoUrl.includes('/uploads/logos/');
            return {
              ...prev,
              ...(!temLogoManual && ativos.headerLogoUrl ? { logoUrl: ativos.headerLogoUrl } : {}),
              ...(ativos.assinaturaUrl ? { assinaturaUrl: ativos.assinaturaUrl } : {})
            };
          });
        }

        if (onToast) {
          onToast('Padrão cirúrgico identificado com sucesso! Revise e salve abaixo.');
        }
      }
    } catch (err) {
      console.error('Erro na análise de padrão cirúrgico:', err);
      if (onToast) onToast(`Falha ao analisar relatórios cirúrgicos: ${err.message}`);
    } finally {
      setAnalisando(false);
      setEtapaAnalise('');
    }
  };

  const handleSalvarPerfil = async () => {
    if (!perfilEditando) return;
    setSalvando(true);
    try {
      const payload = {
        ativo: true,
        nomeDetectado: perfilEditando.nomeDetectado,
        crmvDetectado: perfilEditando.crmvDetectado,
        clinicaDetectada: perfilEditando.clinicaDetectada,
        layoutDetectado: perfilEditando.templateVisual || perfilEditando.layoutDetectado,
        templateVisual: perfilEditando.templateVisual,
        ordemSecoes: perfilEditando.ordemSecoes,
        estiloRedacao: perfilEditando.estiloRedacao,
        vocabularioPreferido: perfilEditando.vocabularioPreferido,
        observacoesEstilo: perfilEditando.observacoesEstilo,
        atualizarUsuarioCrmv: perfilEditando.atualizarUsuarioCrmv,
        atualizarUsuarioClinica: perfilEditando.atualizarUsuarioClinica,
        atualizarUsuarioNome: perfilEditando.atualizarUsuarioNome,
        amostras: perfilEditando.amostras
      };

      const res = await api.salvarPerfilCirurgico(payload);
      if (res && res.sucesso) {
        setPerfilDb(res.perfil);
        if (setUserProfile) {
          setUserProfile((prev) => ({
            ...prev,
            crmv: perfilEditando.atualizarUsuarioCrmv && perfilEditando.crmvDetectado ? perfilEditando.crmvDetectado : prev.crmv,
            nomeClinica: perfilEditando.atualizarUsuarioClinica && perfilEditando.clinicaDetectada ? perfilEditando.clinicaDetectada : prev.nomeClinica,
            clinicName: perfilEditando.atualizarUsuarioClinica && perfilEditando.clinicaDetectada ? perfilEditando.clinicaDetectada : prev.clinicName,
            nome: perfilEditando.atualizarUsuarioNome && perfilEditando.nomeDetectado ? perfilEditando.nomeDetectado : prev.nome,
            name: perfilEditando.atualizarUsuarioNome && perfilEditando.nomeDetectado ? perfilEditando.nomeDetectado : prev.name
          }));
        }
        setArquivosPdfs([]);
        if (onToast) onToast('Padrão cirúrgico salvo! Seus novos relatórios cirúrgicos seguirão este modelo.');
      }
    } catch (err) {
      if (onToast) onToast(`Erro ao salvar padrão cirúrgico: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleResetarPadrao = async () => {
    if (!window.confirm('Deseja remover seu padrão cirúrgico personalizado e voltar ao formato oficial padrão?')) {
      return;
    }
    setRedefinindo(true);
    try {
      await api.resetPerfilCirurgico();
      setPerfilDb(null);
      setPerfilEditando(null);
      setArquivosPdfs([]);
      if (onToast) onToast('Padrão cirúrgico oficial restaurado.');
    } catch (err) {
      if (onToast) onToast(`Erro ao restaurar padrão cirúrgico: ${err.message}`);
    } finally {
      setRedefinindo(false);
    }
  };

  const handleCriarManualmente = () => {
    setPerfilEditando(montarEstadoEdicao({}, userProfile, {}));
  };

  const temPerfilAtivo = Boolean(perfilDb && perfilDb.ativo);
  const tv = perfilEditando?.templateVisual || {};
  const temLogoManual = typeof userProfile?.logoUrl === 'string' && userProfile.logoUrl.includes('/uploads/logos/');
  const logoPreviewUrl = (temLogoManual ? userProfile.logoUrl : null) || tv.ativosVisuais?.headerLogoUrl || userProfile?.logoUrl || null;

  const inputClass = `w-full px-3 py-2 rounded-xl text-xs border font-medium ${
    darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
  }`;

  return (
    <div className="space-y-6">
      {/* 1. Header de Status */}
      <div
        className={`p-6 rounded-2xl border transition ${
          darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#00D296]" />
              <h3 className="text-base font-extrabold tracking-tight">
                Copiar Padrão de Relatório Cirúrgico
              </h3>
              {temPerfilAtivo ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/30">
                  Padrão Cirúrgico Personalizado Ativo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-500/20 text-slate-400 border border-slate-500/30">
                  Padrão Oficial Vetaro
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {temPerfilAtivo
                ? `Seus relatórios cirúrgicos estão reproduzindo o layout, cabeçalho, seções e estilo de redação de ${perfilDb.nomeDetectado || userProfile.name} (${perfilDb.clinicaDetectada || userProfile.clinicName}).`
                : 'Envie de 1 a 10 relatórios cirúrgicos seus em PDF para que a IA copie automaticamente seu cabeçalho, logotipo, cores, rótulos das seções, estilo de redação e legendas das fotos.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {!perfilEditando && !carregando && (
              <button
                type="button"
                onClick={handleCriarManualmente}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#00D296]/40 text-[#00D296] hover:bg-[#00D296]/10 transition"
              >
                Personalizar Manualmente
              </button>
            )}
            {temPerfilAtivo && (
              <button
                type="button"
                disabled={redefinindo}
                onClick={handleResetarPadrao}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  darkMode
                    ? 'bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão Oficial</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Dropzone de até 10 PDFs de Relatórios Cirúrgicos */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <FileUp className="w-4 h-4 text-[#00D296]" />
              <span>
                {temPerfilAtivo
                  ? 'Atualizar Padrão com Novos Relatórios Cirúrgicos'
                  : 'Enviar Relatórios Cirúrgicos Anteriores em PDF'}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Suba de 1 a 10 relatórios cirúrgicos em PDF. A IA copiará sua identidade visual, cabeçalho, rótulos, escrita cirúrgica e formato da página de fotos.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold self-start sm:self-auto ${
              arquivosPdfs.length > 0
                ? 'bg-[#00D296]/20 text-[#00D296]'
                : darkMode
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {arquivosPdfs.length} / 10 PDFs selecionados
          </span>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            darkMode
              ? 'border-slate-700 bg-[#0A141D] hover:border-[#00D296] hover:bg-slate-800/40'
              : 'border-slate-300 bg-slate-50 hover:border-[#00D296] hover:bg-slate-100'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".pdf,application/pdf"
            onChange={handleSelecionarArquivos}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-[#00D296]/10 text-[#00D296] flex items-center justify-center mb-1">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-extrabold">
            Clique para selecionar até 10 relatórios cirúrgicos em PDF
          </p>
          <p className="text-[11px] text-slate-400 max-w-md">
            Arquivos aceitos: <strong className="text-slate-300">.pdf</strong> (máx. 15MB cada). O sistema extrai logotipo, assinatura, cores, margens, estrutura de seções e estilo de escrita cirúrgica.
          </p>
        </div>

        {arquivosPdfs.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {arquivosPdfs.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-bold truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({formatarTamanho(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoverArquivo(idx)}
                    className="p-1 hover:text-rose-400 transition text-slate-400 shrink-0"
                    title="Remover arquivo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={analisando}
                onClick={handleAnalisarPdfs}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 bg-[#00D296] text-[#062E2B] hover:bg-[#00ba84] shadow-md shadow-[#00D296]/20 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analisar e Copiar Meu Padrão Cirúrgico (IA)</span>
              </button>
            </div>
          </div>
        )}

        {analisando && (
          <div
            className={`p-6 rounded-2xl border text-center space-y-3 animate-pulse ${
              darkMode ? 'bg-[#0A141D] border-[#00D296]/40' : 'bg-[#00D296]/5 border-[#00D296]/30'
            }`}
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#00D296] border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-extrabold text-[#00D296]">
              {etapaAnalise || 'Analisando relatórios cirúrgicos com IA...'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Painel de Revisão & Ajuste Fino */}
      {perfilEditando && (
        <div
          className={`p-6 rounded-2xl border space-y-6 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="border-b pb-3 border-slate-700/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00D296]" />
                <span>Padrão de Relatório Cirúrgico Configurado</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Revise o design, os rótulos das seções e as diretrizes de redação antes de salvar.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700/40 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAbaVisualAtiva('design')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  abaVisualAtiva === 'design'
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Design & Layout</span>
              </button>
              <button
                type="button"
                onClick={() => setAbaVisualAtiva('redacao')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  abaVisualAtiva === 'redacao'
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Seções & Redação</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoSplitPdf(false);
                  setAbaVisualAtiva('preview');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  abaVisualAtiva === 'preview' && !modoSplitPdf
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>PDF Real</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const proximo = !modoSplitPdf;
                  setModoSplitPdf(proximo);
                  if (proximo && abaVisualAtiva === 'preview') setAbaVisualAtiva('design');
                }}
                title="Editar ao lado do PDF real"
                className={`hidden lg:flex px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-1.5 transition ${
                  modoSplitPdf
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split PDF</span>
              </button>
            </div>
          </div>

          <div className={modoSplitPdf ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : ''}>
          <div className={modoSplitPdf ? 'lg:col-span-6 space-y-5' : 'space-y-5'}>
          {/* SUB-ABA 1: DESIGN & LAYOUT */}
          {abaVisualAtiva === 'design' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Identificação Profissional</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Nome do(a) Cirurgião(ã)
                    </label>
                    <input
                      type="text"
                      value={perfilEditando.nomeDetectado}
                      onChange={(e) => setPerfilEditando({ ...perfilEditando, nomeDetectado: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      CRMV / UF
                    </label>
                    <input
                      type="text"
                      value={perfilEditando.crmvDetectado}
                      onChange={(e) => setPerfilEditando({ ...perfilEditando, crmvDetectado: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Nome da Clínica / Hospital
                    </label>
                    <input
                      type="text"
                      value={perfilEditando.clinicaDetectada}
                      onChange={(e) => setPerfilEditando({ ...perfilEditando, clinicaDetectada: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-700/40">
                <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5" />
                  <span>Diagramação do Relatório Cirúrgico</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Formato do Cabeçalho
                    </label>
                    <select
                      value={tv.tipoCabecalho}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tipoCabecalho: e.target.value }
                        })
                      }
                      className={inputClass}
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
                      value={tv.tipoDadosPaciente}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tipoDadosPaciente: e.target.value }
                        })
                      }
                      className={inputClass}
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
                      value={tv.estiloSecoes}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, estiloSecoes: e.target.value }
                        })
                      }
                      className={inputClass}
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
                      value={tv.decoracaoTitulo}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, decoracaoTitulo: e.target.value }
                        })
                      }
                      className={inputClass}
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
                      value={tv.posicaoAssinatura}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, posicaoAssinatura: e.target.value }
                        })
                      }
                      className={inputClass}
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
                      value={tv.rotuloResponsavel}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, rotuloResponsavel: e.target.value }
                        })
                      }
                      className={inputClass}
                    >
                      <option value="Responsável">Responsável</option>
                      <option value="Tutor">Tutor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Título Principal do Documento
                    </label>
                    <input
                      type="text"
                      value={tv.tituloDocumento}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tituloDocumento: e.target.value }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Subtítulo (opcional)
                    </label>
                    <input
                      type="text"
                      value={tv.subtituloDocumento}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, subtituloDocumento: e.target.value }
                        })
                      }
                      placeholder="Ex: Centro Cirúrgico Veterinário"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Cor Primária
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tv.corPrimaria || '#1B365D'}
                        onChange={(e) =>
                          setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: { ...tv, corPrimaria: e.target.value }
                          })
                        }
                        className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-400">{tv.corPrimaria}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Cor Secundária
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tv.corSecundaria || '#4A777A'}
                        onChange={(e) =>
                          setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: { ...tv, corSecundaria: e.target.value }
                          })
                        }
                        className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-400">{tv.corSecundaria}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Fonte
                    </label>
                    <select
                      value={tv.fontFamily}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontFamily: e.target.value }
                        })
                      }
                      className={inputClass}
                    >
                      {FONTES_DISPONIVEIS.map((f) => (
                        <option key={f} value={f}>
                          {f.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Fonte do Cabeçalho
                    </label>
                    <select
                      value={tv.fontSizeCabecalho || tv.fontSizeBody || '11pt'}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontSizeCabecalho: e.target.value }
                        })
                      }
                      className={inputClass}
                    >
                      {TAMANHOS_FONTE_CORPO.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                      {tv.fontSizeCabecalho && !TAMANHOS_FONTE_CORPO.includes(tv.fontSizeCabecalho) && (
                        <option value={tv.fontSizeCabecalho}>{tv.fontSizeCabecalho} (Extraído)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Tamanho do Corpo
                    </label>
                    <select
                      value={tv.fontSizeBody || '11pt'}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontSizeBody: e.target.value }
                        })
                      }
                      className={inputClass}
                    >
                      {TAMANHOS_FONTE_CORPO.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                      {tv.fontSizeBody && !TAMANHOS_FONTE_CORPO.includes(tv.fontSizeBody) && (
                        <option value={tv.fontSizeBody}>{tv.fontSizeBody} (Extraído)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Tamanho do Título
                    </label>
                    <select
                      value={tv.fontSizeTitulo || '13.5pt'}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontSizeTitulo: e.target.value }
                        })
                      }
                      className={inputClass}
                    >
                      {TAMANHOS_FONTE_TITULO.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                      {tv.fontSizeTitulo && !TAMANHOS_FONTE_TITULO.includes(tv.fontSizeTitulo) && (
                        <option value={tv.fontSizeTitulo}>{tv.fontSizeTitulo} (Extraído)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Espaço entre Tópicos
                    </label>
                    <select
                      value={tv.paragraphSpacing || '8pt'}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, paragraphSpacing: e.target.value }
                        })
                      }
                      className={inputClass}
                    >
                      {ESPACAMENTOS_TOPICOS.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp}
                          {sp === '6pt' ? ' (Compacto)' : sp === '10pt' ? ' (Equilibrado)' : sp === '16pt' ? ' (Amplo)' : ''}
                        </option>
                      ))}
                      {tv.paragraphSpacing && !ESPACAMENTOS_TOPICOS.includes(tv.paragraphSpacing) && (
                        <option value={tv.paragraphSpacing}>{tv.paragraphSpacing} (Extraído)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tv.mostrarAssinaturaImagem !== false}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, mostrarAssinaturaImagem: e.target.checked }
                        })
                      }
                      className="rounded border-slate-600 accent-[#00D296]"
                    />
                    <span className="text-slate-300">Exibir imagem da assinatura</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tv.mostrarAssinaturaTexto !== false}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, mostrarAssinaturaTexto: e.target.checked }
                        })
                      }
                      className="rounded border-slate-600 accent-[#00D296]"
                    />
                    <span className="text-slate-300">Exibir nome e CRMV</span>
                  </label>
                </div>

                {/* Registro Fotográfico e Rodapé */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/40">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-[#00D296]" />
                      <span>Título da Página de Fotos</span>
                    </label>
                    <input
                      type="text"
                      value={tv.tituloRegistroFotografico}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tituloRegistroFotografico: e.target.value }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Legenda Padrão das Imagens (editável na pré-visualização)
                    </label>
                    <input
                      type="text"
                      value={tv.legendaPadraoFoto}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, legendaPadraoFoto: e.target.value }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Contato / Endereço no Rodapé (opcional)
                    </label>
                    <input
                      type="text"
                      value={tv.rodapeContato}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, rodapeContato: e.target.value }
                        })
                      }
                      placeholder="Ex: Rua das Flores, 123 • WhatsApp (31) 99999-9999"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Aviso Legal / Nota de Rodapé (opcional)
                    </label>
                    <input
                      type="text"
                      value={tv.textoAvisoLegal}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, textoAvisoLegal: e.target.value }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 2: SEÇÕES & REDAÇÃO CIRÚRGICA */}
          {abaVisualAtiva === 'redacao' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider">
                  Rótulos das Seções do Relatório
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'data', label: 'Seção de Data' },
                    { key: 'procedimento', label: 'Seção de Procedimento' },
                    { key: 'diagnostico', label: 'Seção de Diagnóstico Pré-Cirúrgico' },
                    { key: 'descricao', label: 'Seção de Descrição Técnica' },
                    { key: 'evolucao', label: 'Seção de Evolução e Considerações' }
                  ].map((item) => (
                    <div key={item.key}>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        value={tv.rotulosSecoes?.[item.key] || ROTULOS_PADRAO[item.key]}
                        onChange={(e) =>
                          setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: {
                              ...tv,
                              rotulosSecoes: {
                                ...(tv.rotulosSecoes || ROTULOS_PADRAO),
                                [item.key]: e.target.value
                              }
                            }
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-700/40">
                <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider">
                  Diretrizes de Redação para a IA
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Pessoa Verbal Preferida
                    </label>
                    <input
                      type="text"
                      value={perfilEditando.estiloRedacao?.pessoaVerbal || ''}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          estiloRedacao: { ...perfilEditando.estiloRedacao, pessoaVerbal: e.target.value }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Detalhamento de Fios e Síntese
                    </label>
                    <input
                      type="text"
                      value={perfilEditando.estiloRedacao?.detalhamentoFios || ''}
                      onChange={(e) =>
                        setPerfilEditando({
                          ...perfilEditando,
                          estiloRedacao: { ...perfilEditando.estiloRedacao, detalhamentoFios: e.target.value }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Frase Padrão de Preparo / Antissepsia (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={perfilEditando.estiloRedacao?.frasePadraoAntissepsia || ''}
                    onChange={(e) =>
                      setPerfilEditando({
                        ...perfilEditando,
                        estiloRedacao: { ...perfilEditando.estiloRedacao, frasePadraoAntissepsia: e.target.value }
                      })
                    }
                    placeholder="Ex: Paciente posicionado em decúbito dorsal sob anestesia geral inalatória, antissepsia rigorosa em 3 ciclos..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Frase Padrão de Evolução / Recuperação Pós-Anestésica (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={perfilEditando.estiloRedacao?.frasePadraoEvolucao || ''}
                    onChange={(e) =>
                      setPerfilEditando({
                        ...perfilEditando,
                        estiloRedacao: { ...perfilEditando.estiloRedacao, frasePadraoEvolucao: e.target.value }
                      })
                    }
                    placeholder="Ex: Procedimento transcorrido sem intercorrências, paciente extubado estável..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Observações Gerais de Estilo para a IA
                  </label>
                  <textarea
                    rows={3}
                    value={perfilEditando.observacoesEstilo || ''}
                    onChange={(e) =>
                      setPerfilEditando({ ...perfilEditando, observacoesEstilo: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 3: PRÉ-VISUALIZAÇÃO AO VIVO */}
          {abaVisualAtiva === 'preview' && (
            <div className="bg-white text-slate-900 rounded-xl border border-slate-300 p-6 sm:p-8 shadow-inner space-y-4 max-w-3xl mx-auto" style={{ fontFamily: tv.fontFamily }}>
              {/* Cabeçalho simulado */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200">
                <div className="w-1/3">
                  {logoPreviewUrl && tv.tipoCabecalho !== 'sem-logo-tipografico' ? (
                    <img
                      src={logoPreviewUrl}
                      alt={perfilEditando.clinicaDetectada || 'Logo'}
                      className="max-h-14 max-w-[140px] object-contain"
                    />
                  ) : (
                    <span className="text-lg font-black" style={{ color: tv.corPrimaria }}>
                      {perfilEditando.clinicaDetectada || userProfile.clinicName || 'Sua Clínica'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] leading-snug">
                  <div><strong>Nome:</strong> Thor</div>
                  <div><strong>Sexo:</strong> Macho</div>
                  <div><strong>Idade:</strong> 5 anos</div>
                </div>
                <div className="text-[11px] leading-snug">
                  <div><strong>{tv.rotuloResponsavel || 'Responsável'}:</strong> Carlos Silva</div>
                  <div><strong>Espécie:</strong> Canina</div>
                  <div><strong>Peso:</strong> 14 kg</div>
                </div>
              </div>

              {/* Título */}
              <div
                className="font-bold uppercase tracking-wide py-1"
                style={{
                  fontSize: tv.fontSizeTitulo || '13.5pt',
                  textAlign: tv.alinhamentoTitulo === 'left' ? 'left' : 'center',
                  color: tv.decoracaoTitulo === 'faixa-colorida' ? '#fff' : tv.corPrimaria,
                  background: tv.decoracaoTitulo === 'faixa-colorida' ? tv.corPrimaria : 'transparent',
                  borderBottom: tv.decoracaoTitulo === 'borda-inferior' ? `2px solid ${tv.corPrimaria}` : 'none',
                  padding: tv.decoracaoTitulo === 'faixa-colorida' ? '6px 10px' : undefined,
                  borderRadius: tv.decoracaoTitulo === 'faixa-colorida' ? '4px' : undefined
                }}
              >
                {tv.tituloDocumento || 'RELATÓRIO CIRÚRGICO'}
              </div>

              {/* Corpo exemplo */}
              <div
                className="flex flex-col leading-relaxed"
                style={{
                  fontSize: tv.fontSizeBody || '11pt',
                  gap: tv.paragraphSpacing || '8pt'
                }}
              >
                <p>
                  <strong style={{ color: tv.corPrimaria }}>{tv.rotulosSecoes?.data || ROTULOS_PADRAO.data}:</strong>{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <strong style={{ color: tv.corPrimaria }}>{tv.rotulosSecoes?.procedimento || ROTULOS_PADRAO.procedimento}:</strong>{' '}
                  Orquiectomia pré-escrotal eletiva
                </p>
                <p>
                  <strong style={{ color: tv.corPrimaria }}>{tv.rotulosSecoes?.descricao || ROTULOS_PADRAO.descricao}:</strong>{' '}
                  {perfilEditando.estiloRedacao?.frasePadraoAntissepsia ||
                    'Antissepsia rigorosa em 3 ciclos com clorexidina degermante e alcoólica. Incisão pré-escrotal, ligadura tripla do cordão espermático e síntese por planos.'}
                </p>
                <p>
                  <strong style={{ color: tv.corPrimaria }}>{tv.rotulosSecoes?.evolucao || ROTULOS_PADRAO.evolucao}:</strong>{' '}
                  {perfilEditando.estiloRedacao?.frasePadraoEvolucao ||
                    'Procedimento transcorrido sem intercorrências. Paciente recuperado com parâmetros estáveis.'}
                </p>
              </div>

              {/* Assinatura */}
              <div
                className="pt-4 text-xs"
                style={{
                  textAlign: tv.posicaoAssinatura === 'direita' ? 'right' : tv.posicaoAssinatura === 'esquerda' ? 'left' : 'center'
                }}
              >
                {tv.linhaAssinatura && <div className="inline-block w-44 border-t border-slate-500 mb-1" />}
                <div className="font-bold">{perfilEditando.nomeDetectado || userProfile.name}</div>
                <div className="text-slate-600">{perfilEditando.crmvDetectado || userProfile.crmv}</div>
              </div>
            </div>
          )}
          </div>

          {/* PAINEL LATERAL OU ABA DE PDF REAL AO VIVO */}
          {(modoSplitPdf || abaVisualAtiva === 'preview') && (
            <div
              className={`${modoSplitPdf ? 'lg:col-span-6 lg:sticky lg:top-4' : 'mt-4'} rounded-2xl border overflow-hidden flex flex-col ${
                darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}
              style={{ height: '720px' }}
            >
              <div
                className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#00D296] shrink-0" />
                  <span className="text-xs font-extrabold truncate">
                    Pré-visualização Real em PDF (Seu Padrão)
                  </span>
                  {gerandoPdfPreview && (
                    <span className="text-[10px] font-bold text-[#00D296] animate-pulse">
                      Atualizando...
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={gerandoPdfPreview}
                  onClick={() => gerarPreviewPdfAoVivo(perfilEditando)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-700 hover:border-[#00D296] text-slate-300 hover:text-white transition inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${gerandoPdfPreview ? 'animate-spin' : ''}`} />
                  <span>Atualizar PDF</span>
                </button>
              </div>
              <div className="flex-1 relative bg-slate-900">
                {erroPdfPreview ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-rose-400 text-xs gap-2">
                    <p className="font-bold">Não foi possível gerar o PDF de pré-visualização.</p>
                    <p className="text-slate-400">{erroPdfPreview}</p>
                  </div>
                ) : pdfPreviewUrl ? (
                  <iframe
                    key={pdfPreviewUrl}
                    title="Pré-visualização PDF do Padrão Cirúrgico"
                    src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&view=FitH`}
                    className="w-full h-full border-0 block"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#00D296]" />
                    <p className="font-bold">Gerando pré-visualização real do seu PDF...</p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          {/* Rodapé de Salvar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-700/40">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perfilEditando.atualizarUsuarioCrmv}
                  onChange={(e) => setPerfilEditando({ ...perfilEditando, atualizarUsuarioCrmv: e.target.checked })}
                />
                <span>Atualizar meu CRMV</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perfilEditando.atualizarUsuarioClinica}
                  onChange={(e) => setPerfilEditando({ ...perfilEditando, atualizarUsuarioClinica: e.target.checked })}
                />
                <span>Atualizar nome da clínica</span>
              </label>
            </div>

            <button
              type="button"
              disabled={salvando}
              onClick={handleSalvarPerfil}
              className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-[#00D296] text-[#062E2B] hover:bg-[#00ba84] shadow-md transition disabled:opacity-50"
            >
              {salvando ? 'Salvando Padrão Cirúrgico...' : 'Salvar e Ativar Padrão Cirúrgico'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
