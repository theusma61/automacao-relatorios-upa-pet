import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RotateCcw,
  Palette,
  Layers,
  Type,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Stethoscope,
  Building2,
  FileUp,
  Check,
  Eye,
  Layout,
  Table as TableIcon
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

export default function EstiloLaudoTab({
  darkMode,
  isMobileLayout,
  onToast,
  userProfile,
  setUserProfile
}) {
  const fileInputRef = useRef(null);

  const [perfilDb, setPerfilDb] = useState(null);
  const [layoutDb, setLayoutDb] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Arquivos selecionados
  const [arquivosPdfs, setArquivosPdfs] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [etapaAnalise, setEtapaAnalise] = useState('');

  // Perfil em edição / revisão
  const [perfilEditando, setPerfilEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [redefinindo, setRedefinindo] = useState(false);
  const [abaVisualAtiva, setAbaVisualAtiva] = useState('design'); // 'design', 'clinico', 'preview'

  const carregarPerfil = async () => {
    setCarregando(true);
    try {
      const res = await api.getPerfilLaudo();
      if (res && res.sucesso) {
        setPerfilDb(res.perfil);
        setLayoutDb(res.layout);
        if (res.perfil && res.perfil.ativo) {
          const tVisual = res.perfil.templateVisual || res.perfil.layoutDetectado || {};
          setPerfilEditando({
            nomeDetectado: res.perfil.nomeDetectado || res.usuario?.nome || '',
            crmvDetectado: res.perfil.crmvDetectado || res.usuario?.crmv || '',
            clinicaDetectada: res.perfil.clinicaDetectada || res.usuario?.nomeClinica || '',
            layoutDetectado: res.layout || res.perfil.layoutDetectado || {},
            templateVisual: {
              tipoCabecalho: tVisual.tipoCabecalho || 'logo-esquerda-texto-direita',
              tipoDadosPaciente: tVisual.tipoDadosPaciente || 'tabela-zebrada',
              tituloDocumento: tVisual.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL',
              subtituloDocumento: tVisual.subtituloDocumento || '',
              alinhamentoTitulo: tVisual.alinhamentoTitulo || 'center',
              decoracaoTitulo: tVisual.decoracaoTitulo || 'nenhuma',
              estiloOrgaos: tVisual.estiloOrgaos || 'barra-lateral',
              estiloConclusao: tVisual.estiloConclusao || 'caixa-destaque',
              tituloConclusao: tVisual.tituloConclusao || 'IMPRESSÃO DIAGNÓSTICA',
              posicaoAssinatura: tVisual.posicaoAssinatura || 'direita',
              linhaAssinatura: tVisual.linhaAssinatura !== undefined ? tVisual.linhaAssinatura : true,
              textoAvisoLegal: tVisual.textoAvisoLegal || 'O exame ultrassonográfico é um método complementar e deve ser correlacionado com o quadro clínico.',
              rodapeContato: tVisual.rodapeContato || '',
              corPrimaria: tVisual.corPrimaria || res.layout?.cor_primaria || '#1B365D',
              corSecundaria: tVisual.corSecundaria || res.layout?.cor_secundaria || '#4A777A',
              corFundoBlocos: tVisual.corFundoBlocos || '#F8FAFC',
              corBordaTabelas: tVisual.corBordaTabelas || '#E2E8F0',
              fontFamily: tVisual.fontFamily || res.layout?.font_family || 'Calibri, sans-serif',
              fontSizeBody: tVisual.fontSizeBody || res.layout?.font_size_body || '11pt',
              fontSizeTitulo: tVisual.fontSizeTitulo || res.layout?.font_size_titulo || '14pt',
              marginTop: tVisual.marginTop || res.layout?.margin_top || '20mm',
              marginBottom: tVisual.marginBottom || res.layout?.margin_bottom || '20mm',
              marginLeft: tVisual.marginLeft || res.layout?.margin_left || '15mm',
              marginRight: tVisual.marginRight || res.layout?.margin_right || '15mm',
              lineHeight: tVisual.lineHeight || res.layout?.line_height || '1.4',
              paragraphSpacing: tVisual.paragraphSpacing || res.layout?.paragraph_spacing || '8pt'
            },
            ordemOrgaos: Array.isArray(res.perfil.ordemOrgaos) ? [...res.perfil.ordemOrgaos] : [],
            frasesNormalidade: res.perfil.frasesNormalidade || {},
            vocabularioPreferido: res.perfil.vocabularioPreferido || {},
            estiloConclusao: res.perfil.estiloConclusao || '',
            observacoesEstilo: res.perfil.observacoesEstilo || '',
            atualizarUsuarioCrmv: true,
            atualizarUsuarioClinica: true,
            atualizarUsuarioNome: false,
            amostras: res.perfil.arquivosAmostras || []
          });
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar perfil de laudo:', err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
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
    let arquivosIgnorados = 0;

    for (const f of files) {
      const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf';
      if (!isPdf) {
        arquivosIgnorados++;
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        if (onToast) onToast(`O arquivo "${f.name}" excede o limite de 15MB.`, 'error');
        continue;
      }
      pdfsValidos.push(f);
    }

    if (arquivosIgnorados > 0 && onToast) {
      onToast(`${arquivosIgnorados} arquivo(s) foram ignorados porque não são PDFs.`, 'warning');
    }

    const totalPossivel = [...arquivosPdfs, ...pdfsValidos];
    if (totalPossivel.length > 10) {
      const excedente = totalPossivel.length - 10;
      setArquivosPdfs(totalPossivel.slice(0, 10));
      if (onToast) onToast(`Limite de 10 PDFs atingido. Os últimos ${excedente} arquivos foram desconsiderados.`, 'warning');
    } else {
      setArquivosPdfs(totalPossivel);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoverArquivo = (index) => {
    setArquivosPdfs(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalisarPdfs = async () => {
    if (arquivosPdfs.length === 0) {
      if (onToast) onToast('Selecione pelo menos 1 arquivo PDF de laudo seu.', 'warning');
      return;
    }

    setAnalisando(true);
    setEtapaAnalise('Enviando PDFs e iniciando análise visual e clínica com IA...');

    try {
      const formData = new FormData();
      arquivosPdfs.forEach(file => {
        formData.append('pdfs', file);
      });

      const timer1 = setTimeout(() => {
        setEtapaAnalise('Identificando geometria, tipo de cabeçalho, tabelas de paciente e paleta de cores...');
      }, 3500);

      const timer2 = setTimeout(() => {
        setEtapaAnalise('Mapeando ordem dos órgãos, frases de normalidade e estilo da conclusão...');
      }, 7500);

      const res = await api.aprenderPadraoLaudo(formData);
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res && res.sucesso && res.perfilDetectado) {
        const detectado = res.perfilDetectado;
        const tVisual = detectado.templateVisual || detectado.layoutDetectado || {};

        setPerfilEditando({
          nomeDetectado: detectado.nomeDetectado || userProfile.nome || '',
          crmvDetectado: detectado.crmvDetectado || userProfile.crmv || '',
          clinicaDetectada: detectado.clinicaDetectada || userProfile.nomeClinica || '',
          layoutDetectado: detectado.layoutDetectado || {},
          templateVisual: {
            ...tVisual,
            tipoCabecalho: tVisual.tipoCabecalho || 'logo-esquerda-texto-direita',
            tipoDadosPaciente: tVisual.tipoDadosPaciente || 'tabela-zebrada',
            tituloDocumento: tVisual.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL',
            subtituloDocumento: tVisual.subtituloDocumento || '',
            alinhamentoTitulo: tVisual.alinhamentoTitulo || 'center',
            decoracaoTitulo: tVisual.decoracaoTitulo || 'nenhuma',
            estiloOrgaos: tVisual.estiloOrgaos || 'barra-lateral',
            estiloConclusao: tVisual.estiloConclusao || 'caixa-destaque',
            tituloConclusao: tVisual.tituloConclusao || 'IMPRESSÃO DIAGNÓSTICA',
            posicaoAssinatura: tVisual.posicaoAssinatura || 'direita',
            linhaAssinatura: tVisual.linhaAssinatura !== undefined ? tVisual.linhaAssinatura : true,
            textoAvisoLegal: tVisual.textoAvisoLegal || 'O exame ultrassonográfico é um método complementar...',
            rodapeContato: tVisual.rodapeContato || '',
            corPrimaria: tVisual.corPrimaria || '#1B365D',
            corSecundaria: tVisual.corSecundaria || '#4A777A',
            corFundoBlocos: tVisual.corFundoBlocos || '#F8FAFC',
            corBordaTabelas: tVisual.corBordaTabelas || '#E2E8F0',
            fontFamily: tVisual.fontFamily || 'Calibri, sans-serif',
            fontSizeBody: tVisual.fontSizeBody || '11pt',
            fontSizeTitulo: tVisual.fontSizeTitulo || '14pt',
            marginTop: tVisual.marginTop || '20mm',
            marginBottom: tVisual.marginBottom || '20mm',
            marginLeft: tVisual.marginLeft || '15mm',
            marginRight: tVisual.marginRight || '15mm',
            lineHeight: tVisual.lineHeight || '1.4',
            paragraphSpacing: tVisual.paragraphSpacing || '8pt'
          },
          ordemOrgaos: detectado.ordemOrgaos || [],
          frasesNormalidade: detectado.frasesNormalidade || {},
          vocabularioPreferido: detectado.vocabularioPreferido || {},
          estiloConclusao: detectado.estiloConclusao || '',
          observacoesEstilo: detectado.observacoesEstilo || '',
          atualizarUsuarioCrmv: true,
          atualizarUsuarioClinica: true,
          atualizarUsuarioNome: Boolean(!userProfile.nome || userProfile.nome === 'Camila Bastos'),
          amostras: detectado.amostras || []
        });

        if (onToast) onToast('Padrão visual e estrutural identificado com sucesso! Revise e confirme abaixo.', 'success');
      }
    } catch (err) {
      console.error('Erro na análise de padrão:', err);
      if (onToast) onToast(`Falha na identificação do padrão: ${err.message}`, 'error');
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
        ordemOrgaos: perfilEditando.ordemOrgaos,
        frasesNormalidade: perfilEditando.frasesNormalidade,
        vocabularioPreferido: perfilEditando.vocabularioPreferido,
        estiloConclusao: perfilEditando.estiloConclusao,
        observacoesEstilo: perfilEditando.observacoesEstilo,
        atualizarUsuarioCrmv: perfilEditando.atualizarUsuarioCrmv,
        atualizarUsuarioClinica: perfilEditando.atualizarUsuarioClinica,
        atualizarUsuarioNome: perfilEditando.atualizarUsuarioNome,
        amostras: perfilEditando.amostras
      };

      const res = await api.salvarPerfilLaudo(payload);
      if (res && res.sucesso) {
        setPerfilDb(res.perfil);
        setLayoutDb(res.perfil?.layoutDetectado);

        if (setUserProfile) {
          setUserProfile(prev => ({
            ...prev,
            crmv: perfilEditando.atualizarUsuarioCrmv && perfilEditando.crmvDetectado ? perfilEditando.crmvDetectado : prev.crmv,
            nomeClinica: perfilEditando.atualizarUsuarioClinica && perfilEditando.clinicaDetectada ? perfilEditando.clinicaDetectada : prev.nomeClinica,
            nome: perfilEditando.atualizarUsuarioNome && perfilEditando.nomeDetectado ? perfilEditando.nomeDetectado : prev.nome
          }));
        }

        setArquivosPdfs([]);
        if (onToast) onToast('Seu modelo visual e clínico foi salvo! Seus novos laudos imitarão exatamente este formato.', 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      if (onToast) onToast(`Erro ao salvar padrão: ${err.message}`, 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleResetarPadrao = async () => {
    if (!window.confirm('Tem certeza de que deseja restaurar o padrão institucional UPA PET? Seu estilo customizado será desativado.')) {
      return;
    }

    setRedefinindo(true);
    try {
      await api.resetPerfilLaudo();
      setPerfilDb(null);
      setPerfilEditando(null);
      setArquivosPdfs([]);
      await carregarPerfil();
      if (onToast) onToast('Padrão institucional UPA PET restaurado.', 'info');
    } catch (err) {
      if (onToast) onToast(`Erro ao restaurar: ${err.message}`, 'error');
    } finally {
      setRedefinindo(false);
    }
  };

  const moverOrgao = (index, direcao) => {
    if (!perfilEditando || !Array.isArray(perfilEditando.ordemOrgaos)) return;
    const lista = [...perfilEditando.ordemOrgaos];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    const item = lista.splice(index, 1)[0];
    lista.splice(alvo, 0, item);
    setPerfilEditando(prev => ({ ...prev, ordemOrgaos: lista }));
  };

  const removerOrgao = (index) => {
    if (!perfilEditando || !Array.isArray(perfilEditando.ordemOrgaos)) return;
    const lista = perfilEditando.ordemOrgaos.filter((_, i) => i !== index);
    setPerfilEditando(prev => ({ ...prev, ordemOrgaos: lista }));
  };

  const adicionarOrgao = () => {
    const nome = window.prompt('Digite o nome do órgão (ex: BEXIGA, PRÓSTATA, OLHO):');
    if (!nome || !nome.trim()) return;
    const nomeLimpo = nome.trim().toUpperCase();
    if (perfilEditando.ordemOrgaos.includes(nomeLimpo)) {
      if (onToast) onToast('Este órgão já está na lista.', 'warning');
      return;
    }
    setPerfilEditando(prev => ({
      ...prev,
      ordemOrgaos: [...(prev.ordemOrgaos || []), nomeLimpo]
    }));
  };

  const temPerfilAtivo = Boolean(perfilDb && perfilDb.ativo);
  const tv = perfilEditando?.templateVisual || {};

  return (
    <div className="space-y-6">
      {/* 1. Header do Padrão & Status Atual */}
      <div
        className={`p-6 rounded-2xl border transition ${
          darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00D296]" />
              <h3 className="text-base font-extrabold tracking-tight">
                Estilo & Padrão de Laudo Personalizado
              </h3>
              {temPerfilAtivo ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/30">
                  Padrão Visual Personalizado Ativo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-500/20 text-slate-400 border border-slate-500/30">
                  Padrão Institucional UPA PET
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {temPerfilAtivo
                ? `A IA Vetaro está imitando com fidelidade o design visual, cabeçalho, tabelas e escrita de ${perfilDb.nomeDetectado || userProfile.nome} (${perfilDb.clinicaDetectada || userProfile.nomeClinica || 'Clínica'}) baseado em ${perfilDb.quantidadeAmostras || 0} laudo(s) enviado(s).`
                : 'Você está utilizando o layout padrão da UPA PET. Suba seus laudos em PDF para que a IA aprenda e reproduza exatamente o formato da sua clínica.'}
            </p>
          </div>

          {temPerfilAtivo && (
            <button
              type="button"
              disabled={redefinindo}
              onClick={handleResetarPadrao}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start md:self-auto ${
                darkMode
                  ? 'bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão UPA PET</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Área de Upload (Dropzone de até 10 PDFs) */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <FileUp className="w-4 h-4 text-[#00D296]" />
              <span>{temPerfilAtivo ? 'Atualizar Modelo com Novos Laudos' : 'Enviar Laudos Anteriores em PDF'}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Envie de 1 a 10 laudos em PDF como os seus laudos costumam ficar. A IA extrairá o design visual, cabeçalho, tabelas e escrita para gerar o seu novo padrão.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold self-start sm:self-auto ${
              arquivosPdfs.length > 0
                ? 'bg-[#00D296]/20 text-[#00D296]'
                : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {arquivosPdfs.length} / 10 laudos selecionados
          </span>
        </div>

        {/* Dropzone */}
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
            Clique para selecionar ou arraste até 10 laudos em PDF aqui
          </p>
          <p className="text-[11px] text-slate-400 max-w-md">
            Arquivos suportados: <strong className="text-slate-300">.pdf</strong> (máx. 15MB por arquivo). A IA reconhecerá o layout, logotipo, margens, cores, cabeçalhos de órgãos e notas legais.
          </p>
        </div>

        {/* Lista de PDFs Selecionados */}
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
                    <span className="text-[10px] text-slate-400 shrink-0">({formatarTamanho(file.size)})</span>
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
                <span>Analisar e Reproduzir Meu Formato Visual (IA)</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading de Análise */}
        {analisando && (
          <div
            className={`p-6 rounded-2xl border text-center space-y-3 animate-pulse ${
              darkMode ? 'bg-[#0A141D] border-[#00D296]/40' : 'bg-[#00D296]/5 border-[#00D296]/30'
            }`}
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#00D296] border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-extrabold text-[#00D296]">
              {etapaAnalise || 'Processando laudos com IA Multimodal...'}
            </p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              A inteligência artificial está identificando a diagramação, cores, tipografia, estrutura de tabelas e terminologia para criar o seu padrão exclusivo.
            </p>
          </div>
        )}
      </div>

      {/* 3. Painel de Revisão & Ajuste Fino dos Dados Identificados */}
      {perfilEditando && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Abas internas de revisão */}
            <div className="border-b pb-3 border-slate-700/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00D296]" />
                  <span>Modelo de Laudo Personalizado Detectado</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Revise o formato visual e a estrutura clínica aprendida a partir dos seus PDFs.
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
                  onClick={() => setAbaVisualAtiva('clinico')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    abaVisualAtiva === 'clinico'
                      ? 'bg-[#00D296] text-[#062E2B]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Estrutura & Órgãos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbaVisualAtiva('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    abaVisualAtiva === 'preview'
                      ? 'bg-[#00D296] text-[#062E2B]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pré-visualização</span>
                </button>
              </div>
            </div>

            {/* ABA 1: DESIGN VISUAL & DIAGRAMAÇÃO */}
            {abaVisualAtiva === 'design' && (
              <div className="space-y-5">
                {/* IDENTIFICAÇÃO PROFISSIONAL */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Identificação Profissional & Clínica</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Nome do Médico Veterinário
                      </label>
                      <input
                        type="text"
                        value={perfilEditando.nomeDetectado}
                        onChange={(e) => setPerfilEditando({ ...perfilEditando, nomeDetectado: e.target.value })}
                        placeholder="Ex: Dra. Mariana Costa"
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        CRMV com Estado
                      </label>
                      <input
                        type="text"
                        value={perfilEditando.crmvDetectado}
                        onChange={(e) => setPerfilEditando({ ...perfilEditando, crmvDetectado: e.target.value })}
                        placeholder="Ex: CRMV/SP: 45678"
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Clínica / Hospital / Serviço Volante
                      </label>
                      <input
                        type="text"
                        value={perfilEditando.clinicaDetectada}
                        onChange={(e) => setPerfilEditando({ ...perfilEditando, clinicaDetectada: e.target.value })}
                        placeholder="Ex: Centro de Diagnóstico Vet"
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* DIAGRAMAÇÃO VISUAL ESPECÍFICA */}
                <div className="space-y-4 pt-3 border-t border-slate-700/40">
                  <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5" />
                    <span>Diagramação Visual do Documento</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Formato do Cabeçalho
                      </label>
                      <select
                        value={tv.tipoCabecalho || 'logo-esquerda-texto-direita'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tipoCabecalho: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="logo-esquerda-texto-direita">Logo à esquerda com dados à direita</option>
                        <option value="logo-centro">Logo e dados centralizados no topo</option>
                        <option value="banner-superior">Banner horizontal sólido no topo</option>
                        <option value="duas-colunas-timbrado">Timbrado corporativo clássico</option>
                        <option value="sem-logo-tipografico">Sem logo (cabeçalho tipográfico)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Formato dos Dados do Paciente
                      </label>
                      <select
                        value={tv.tipoDadosPaciente || 'tabela-zebrada'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tipoDadosPaciente: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="tabela-zebrada">Tabela formal com bordas e cabeçalhos</option>
                        <option value="tabela-borda-simples">Tabela com bordas finas sutis</option>
                        <option value="grade-boxes">Grade de cartões individuais</option>
                        <option value="duas-colunas-limpo">Duas colunas com rótulos em negrito</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Destaque Visual dos Órgãos
                      </label>
                      <select
                        value={tv.estiloOrgaos || 'barra-lateral'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, estiloOrgaos: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="barra-lateral">Barra vertical na cor primária à esquerda</option>
                        <option value="tarja-colorida">Tarja sólida colorida (badge no órgão)</option>
                        <option value="sublinhado">Título em caixa alta com linha inferior</option>
                        <option value="negrito-inline">Negrito inline clássico (ÓRGÃO: texto)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Destaque da Conclusão / Diagnóstico
                      </label>
                      <select
                        value={tv.estiloConclusao || 'caixa-destaque'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, estiloConclusao: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="caixa-destaque">Caixa de destaque com borda colorida</option>
                        <option value="secao-sublinhada">Seção separada por divisória</option>
                        <option value="texto-simples">Texto simples corrido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Título da Conclusão
                      </label>
                      <input
                        type="text"
                        value={tv.tituloConclusao || 'IMPRESSÃO DIAGNÓSTICA'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tituloConclusao: e.target.value }
                        })}
                        placeholder="Ex: IMPRESSÃO DIAGNÓSTICA ou CONCLUSÃO"
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Posição da Assinatura
                      </label>
                      <select
                        value={tv.posicaoAssinatura || 'direita'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, posicaoAssinatura: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="direita">Alinhada à Direita</option>
                        <option value="centro">Centralizada no Rodapé</option>
                        <option value="esquerda">Alinhada à Esquerda</option>
                      </select>
                    </div>
                  </div>

                  {/* Título do laudo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Título do Documento (Cabeçalho do Laudo)
                      </label>
                      <input
                        type="text"
                        value={tv.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, tituloDocumento: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Subtítulo Técnico / Metodologia (opcional)
                      </label>
                      <input
                        type="text"
                        value={tv.subtituloDocumento || ''}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, subtituloDocumento: e.target.value }
                        })}
                        placeholder="Ex: Exame ultrassonográfico realizado em modo B com transdutor linear..."
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* CORES E TIPOGRAFIA */}
                <div className="space-y-4 pt-3 border-t border-slate-700/40">
                  <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Identidade Visual, Cores & Tipografia</span>
                  </h5>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Cor Primária (Títulos e Barras)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={tv.corPrimaria || '#1B365D'}
                          onChange={(e) => setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: { ...tv, corPrimaria: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                        />
                        <input
                          type="text"
                          value={tv.corPrimaria || '#1B365D'}
                          onChange={(e) => setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: { ...tv, corPrimaria: e.target.value }
                          })}
                          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                            darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Cor Secundária (Subtítulos/Apoio)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={tv.corSecundaria || '#4A777A'}
                          onChange={(e) => setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: { ...tv, corSecundaria: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                        />
                        <input
                          type="text"
                          value={tv.corSecundaria || '#4A777A'}
                          onChange={(e) => setPerfilEditando({
                            ...perfilEditando,
                            templateVisual: { ...tv, corSecundaria: e.target.value }
                          })}
                          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                            darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Tipografia (Família da Fonte)
                      </label>
                      <select
                        value={tv.fontFamily || 'Calibri, sans-serif'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontFamily: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {FONTES_DISPONIVEIS.map(f => (
                          <option key={f} value={f}>{f.split(',')[0]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Tamanho do Corpo
                      </label>
                      <input
                        type="text"
                        value={tv.fontSizeBody || '11pt'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontSizeBody: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Margens */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Superior</label>
                      <input
                        type="text"
                        value={tv.marginTop || '20mm'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, marginTop: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Inferior</label>
                      <input
                        type="text"
                        value={tv.marginBottom || '20mm'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, marginBottom: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Esquerda</label>
                      <input
                        type="text"
                        value={tv.marginLeft || '15mm'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, marginLeft: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Margem Direita</label>
                      <input
                        type="text"
                        value={tv.marginRight || '15mm'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, marginRight: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Espaçamento entre Categorias / Órgãos e Entrelinha */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Espaço entre Categorias (Órgãos)
                      </label>
                      <select
                        value={tv.paragraphSpacing || '8pt'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, paragraphSpacing: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {['4pt', '6pt', '8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '22pt'].map(sp => (
                          <option key={sp} value={sp}>{sp}{sp === '6pt' ? ' (Compacto)' : sp === '10pt' ? ' (Equilibrado)' : sp === '16pt' ? ' (Amplo)' : ''}</option>
                        ))}
                        {tv.paragraphSpacing && !['4pt', '6pt', '8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '22pt'].includes(tv.paragraphSpacing) && (
                          <option value={tv.paragraphSpacing}>{tv.paragraphSpacing} (Extraído)</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Espaçamento entre Linhas (Entrelinha)
                      </label>
                      <select
                        value={tv.lineHeight || '1.35'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, lineHeight: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border font-medium ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {['1.15', '1.2', '1.25', '1.3', '1.35', '1.4', '1.5', '1.6'].map(lh => (
                          <option key={lh} value={lh}>{lh}</option>
                        ))}
                        {tv.lineHeight && !['1.15', '1.2', '1.25', '1.3', '1.35', '1.4', '1.5', '1.6'].includes(String(tv.lineHeight)) && (
                          <option value={tv.lineHeight}>{tv.lineHeight} (Extraído)</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Tamanho do Título
                      </label>
                      <input
                        type="text"
                        value={tv.fontSizeTitulo || '12pt'}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, fontSizeTitulo: e.target.value }
                        })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Aviso legal e contato */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Aviso Legal / Disclaimer do Rodapé
                      </label>
                      <textarea
                        rows={2}
                        value={tv.textoAvisoLegal || ''}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, textoAvisoLegal: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium resize-none ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Dados de Contato / Rodapé da Clínica
                      </label>
                      <textarea
                        rows={2}
                        value={tv.rodapeContato || ''}
                        onChange={(e) => setPerfilEditando({
                          ...perfilEditando,
                          templateVisual: { ...tv, rodapeContato: e.target.value }
                        })}
                        placeholder="Ex: Av. Veterinária 1000 • Tel: (11) 99999-9999 • contato@vet.com"
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium resize-none ${
                          darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: ESTRUTURA CLÍNICA & ÓRGÃOS */}
            {abaVisualAtiva === 'clinico' && (
              <div className="space-y-5">
                {/* Sequência de órgãos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Sequência dos Órgãos Laudados ({perfilEditando.ordemOrgaos?.length || 0})</span>
                    </h5>
                    <button
                      type="button"
                      onClick={adicionarOrgao}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-[#00D296]/10 text-[#00D296] hover:bg-[#00D296]/20 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Órgão</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {perfilEditando.ordemOrgaos?.map((orgao, idx) => (
                      <div
                        key={`${orgao}-${idx}`}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-[#00D296]/20 text-[#00D296] text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{orgao}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moverOrgao(idx, -1)}
                            className="p-1 hover:text-[#00D296] disabled:opacity-20 text-slate-400"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === perfilEditando.ordemOrgaos.length - 1}
                            onClick={() => moverOrgao(idx, 1)}
                            className="p-1 hover:text-[#00D296] disabled:opacity-20 text-slate-400"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerOrgao(idx)}
                            className="p-1 hover:text-rose-400 text-slate-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frases de normalidade */}
                <div className="space-y-3 pt-3 border-t border-slate-700/40">
                  <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    <span>Frases de Normalidade Habitualmente Usadas</span>
                  </h5>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {Object.entries(perfilEditando.frasesNormalidade || {}).map(([orgao, frase]) => (
                      <div
                        key={orgao}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center gap-1.5 ${
                          darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="font-extrabold text-[#00D296] shrink-0 sm:w-28">
                          {orgao}:
                        </span>
                        <input
                          type="text"
                          value={frase}
                          onChange={(e) => {
                            const novo = { ...perfilEditando.frasesNormalidade, [orgao]: e.target.value };
                            setPerfilEditando({ ...perfilEditando, frasesNormalidade: novo });
                          }}
                          className={`flex-1 px-2 py-1 rounded-lg text-xs border bg-transparent ${
                            darkMode ? 'border-slate-800 text-slate-200' : 'border-slate-300 text-slate-700'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: PRÉ-VISUALIZAÇÃO INTERATIVA EM TEMPO REAL */}
            {abaVisualAtiva === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Veja abaixo uma simulação ao vivo de como a primeira página do seu laudo será gerada pela IA:
                  </p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00D296]/20 text-[#00D296]">
                    A4 - Preview Realista
                  </span>
                </div>

                {/* Folha A4 Simulada */}
                <div
                  className="w-full max-w-2xl mx-auto rounded-lg shadow-2xl p-6 sm:p-8 border text-slate-900 bg-white"
                  style={{
                    fontFamily: tv.fontFamily || 'Calibri, sans-serif',
                    color: '#111'
                  }}
                >
                  {/* Cabeçalho */}
                  <div
                    className="pb-2 mb-3"
                    style={{
                      borderBottom: tv.tipoCabecalho === 'banner-superior' ? 'none' : `1.5px solid ${tv.corSecundaria || '#4A777A'}`,
                      background: tv.tipoCabecalho === 'banner-superior' ? tv.corPrimaria || '#1B365D' : 'transparent',
                      color: tv.tipoCabecalho === 'banner-superior' ? 'white' : '#111',
                      padding: tv.tipoCabecalho === 'banner-superior' ? '10px 14px' : '0 0 8px 0',
                      borderRadius: tv.tipoCabecalho === 'banner-superior' ? '6px' : '0'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm"
                          style={{
                            background: tv.tipoCabecalho === 'banner-superior' ? 'white' : tv.corPrimaria || '#1B365D',
                            color: tv.tipoCabecalho === 'banner-superior' ? tv.corPrimaria || '#1B365D' : 'white'
                          }}
                        >
                          {(perfilEditando.clinicaDetectada || 'CL').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm m-0" style={{ color: tv.tipoCabecalho === 'banner-superior' ? 'white' : tv.corPrimaria || '#1B365D' }}>
                            {perfilEditando.clinicaDetectada || userProfile.nomeClinica || 'Serviço de Diagnóstico Veterinário'}
                          </p>
                          <p className="text-[10px] m-0 opacity-80">
                            {tv.rodapeContato || 'Diagnóstico por Imagem e Ultrassonografia Veterinária'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] opacity-75">
                        <p className="m-0 font-bold">{perfilEditando.nomeDetectado || userProfile.nome || 'Médico Veterinário'}</p>
                        <p className="m-0">{perfilEditando.crmvDetectado || userProfile.crmv || 'CRMV'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Paciente */}
                  <table
                    className="w-full text-[10px] mb-3 border-collapse"
                    style={{ border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}
                  >
                    <tbody>
                      <tr>
                        <th style={{ width: '15%', background: tv.corFundoBlocos || '#F8FAFC', color: tv.corPrimaria || '#1B365D', padding: '3px 6px', textAlign: 'left', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Paciente:</th>
                        <td style={{ width: '35%', padding: '3px 6px', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}`, fontWeight: 'bold' }}>Thor</td>
                        <th style={{ width: '15%', background: tv.corFundoBlocos || '#F8FAFC', color: tv.corPrimaria || '#1B365D', padding: '3px 6px', textAlign: 'left', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Tutor:</th>
                        <td style={{ width: '35%', padding: '3px 6px', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Ana Carolina Silva</td>
                      </tr>
                      <tr>
                        <th style={{ background: tv.corFundoBlocos || '#F8FAFC', color: tv.corPrimaria || '#1B365D', padding: '3px 6px', textAlign: 'left', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Espécie:</th>
                        <td style={{ padding: '3px 6px', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Canina (Golden Retriever)</td>
                        <th style={{ background: tv.corFundoBlocos || '#F8FAFC', color: tv.corPrimaria || '#1B365D', padding: '3px 6px', textAlign: 'left', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Sexo / Idade:</th>
                        <td style={{ padding: '3px 6px', border: `1px solid ${tv.corBordaTabelas || '#E2E8F0'}` }}>Macho • 4 anos</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Título do Laudo */}
                  <div
                    className="text-center my-3 pb-1"
                    style={{
                      borderBottom: tv.decoracaoTitulo === 'borda-inferior' ? `2px solid ${tv.corPrimaria || '#1B365D'}` : 'none'
                    }}
                  >
                    <h1
                      className="text-xs font-black uppercase tracking-wide m-0"
                      style={{ color: tv.corPrimaria || '#1B365D' }}
                    >
                      {tv.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL'}
                    </h1>
                    {tv.subtituloDocumento && (
                      <p className="text-[9px] italic m-0 text-slate-500 mt-0.5">{tv.subtituloDocumento}</p>
                    )}
                  </div>

                  {/* Órgãos de Exemplo com o Estilo Selecionado */}
                  <div className="space-y-2 text-[10px]">
                    {tv.estiloOrgaos === 'tarja-colorida' ? (
                      <>
                        <div>
                          <span
                            className="px-2 py-0.5 rounded font-black text-white uppercase text-[9px]"
                            style={{ background: tv.corPrimaria || '#1B365D' }}
                          >
                            Bexiga
                          </span>
                          <p className="m-0 mt-0.5 text-slate-700">
                            Em topografia habitual, repleção adequada por conteúdo anecogênico límpido, paredes normoespessas e regulares, ausência de sedimentos ou urólitos.
                          </p>
                        </div>
                        <div>
                          <span
                            className="px-2 py-0.5 rounded font-black text-white uppercase text-[9px]"
                            style={{ background: tv.corPrimaria || '#1B365D' }}
                          >
                            Fígado
                          </span>
                          <p className="m-0 mt-0.5 text-slate-700">
                            Dimensões preservadas, contornos regulares, parênquima normoecogênico e ecotextura homogênea, sem evidências de lesões focais ou dilatações biliares.
                          </p>
                        </div>
                      </>
                    ) : tv.estiloOrgaos === 'barra-lateral' ? (
                      <>
                        <div style={{ borderLeft: `3px solid ${tv.corPrimaria || '#1B365D'}`, paddingLeft: '6px' }}>
                          <p className="m-0 font-extrabold uppercase text-[10px]" style={{ color: tv.corPrimaria || '#1B365D' }}>Bexiga</p>
                          <p className="m-0 text-slate-700">Em topografia habitual, repleção adequada por conteúdo anecogênico límpido, paredes normoespessas.</p>
                        </div>
                        <div style={{ borderLeft: `3px solid ${tv.corPrimaria || '#1B365D'}`, paddingLeft: '6px' }}>
                          <p className="m-0 font-extrabold uppercase text-[10px]" style={{ color: tv.corPrimaria || '#1B365D' }}>Fígado</p>
                          <p className="m-0 text-slate-700">Dimensões preservadas, contornos regulares, parênquima normoecogênico e ecotextura homogênea.</p>
                        </div>
                      </>
                    ) : tv.estiloOrgaos === 'sublinhado' ? (
                      <>
                        <div>
                          <p className="m-0 font-extrabold uppercase text-[10px] pb-0.5" style={{ color: tv.corPrimaria || '#1B365D', borderBottom: `1px solid ${tv.corSecundaria || '#4A777A'}` }}>Bexiga</p>
                          <p className="m-0 mt-0.5 text-slate-700">Em topografia habitual, repleção adequada por conteúdo anecogênico límpido, paredes normoespessas.</p>
                        </div>
                        <div>
                          <p className="m-0 font-extrabold uppercase text-[10px] pb-0.5" style={{ color: tv.corPrimaria || '#1B365D', borderBottom: `1px solid ${tv.corSecundaria || '#4A777A'}` }}>Fígado</p>
                          <p className="m-0 mt-0.5 text-slate-700">Dimensões preservadas, contornos regulares, parênquima normoecogênico e ecotextura homogênea.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="m-0 text-slate-700">
                          <strong style={{ color: tv.corPrimaria || '#1B365D' }}>BEXIGA: </strong>
                          Em topografia habitual, repleção adequada por conteúdo anecogênico límpido, paredes normoespessas e regulares.
                        </p>
                        <p className="m-0 text-slate-700">
                          <strong style={{ color: tv.corPrimaria || '#1B365D' }}>FÍGADO: </strong>
                          Dimensões preservadas, contornos regulares, parênquima normoecogênico e ecotextura homogênea.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Conclusão */}
                  <div
                    className="p-2.5 rounded-lg mt-3"
                    style={{
                      background: tv.corFundoBlocos || '#F8FAFC',
                      border: `1.5px solid ${tv.corPrimaria || '#1B365D'}`
                    }}
                  >
                    <p className="m-0 font-black text-[10px] uppercase" style={{ color: tv.corPrimaria || '#1B365D' }}>
                      {tv.tituloConclusao || 'IMPRESSÃO DIAGNÓSTICA'}
                    </p>
                    <p className="m-0 text-[9.5px] text-slate-700 mt-1">
                      Exame ultrassonográfico abdominal sem alterações ecográficas dignas de nota no momento.
                    </p>
                  </div>

                  {/* Assinatura */}
                  <div
                    className="mt-4 pt-2"
                    style={{
                      textAlign: tv.posicaoAssinatura === 'centro' ? 'center' : (tv.posicaoAssinatura === 'esquerda' ? 'left' : 'right')
                    }}
                  >
                    {tv.linhaAssinatura && (
                      <div className="w-28 border-t border-slate-700 inline-block mb-1" />
                    )}
                    <p className="m-0 font-bold text-[10px] text-slate-900">{perfilEditando.nomeDetectado || userProfile.nome || 'Médico Veterinário'}</p>
                    <p className="m-0 text-[9px] text-slate-600">{perfilEditando.crmvDetectado || userProfile.crmv || 'CRMV'}</p>
                  </div>

                  {/* Disclaimer do Rodapé */}
                  <div className="mt-3 pt-1 border-t border-slate-200 text-center text-[8px] italic text-slate-500">
                    {tv.textoAvisoLegal || 'O exame ultrassonográfico é complementar e deve ser correlacionado com a clínica.'}
                  </div>
                </div>
              </div>
            )}

            {/* BOTÕES DE AÇÃO: SALVAR OU DESCARTAR */}
            <div className="border-t pt-4 border-slate-700/40 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPerfilEditando(null)}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition ${
                  darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Descartar Edição
              </button>

              <button
                type="button"
                disabled={salvando}
                onClick={handleSalvarPerfil}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 bg-[#00D296] text-[#062E2B] hover:bg-[#00ba84] shadow-md shadow-[#00D296]/20 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{salvando ? 'Salvando e Ativando Formato...' : 'Salvar e Ativar Meu Formato Visual'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
