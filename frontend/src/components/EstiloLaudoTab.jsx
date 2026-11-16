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
  Check
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

  // Estado de arquivos selecionados
  const [arquivosPdfs, setArquivosPdfs] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [etapaAnalise, setEtapaAnalise] = useState('');

  // Perfil em edição / revisão
  const [perfilEditando, setPerfilEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [redefinindo, setRedefinindo] = useState(false);

  const carregarPerfil = async () => {
    setCarregando(true);
    try {
      const res = await api.getPerfilLaudo();
      if (res && res.sucesso) {
        setPerfilDb(res.perfil);
        setLayoutDb(res.layout);
        if (res.perfil && res.perfil.ativo) {
          setPerfilEditando({
            nomeDetectado: res.perfil.nomeDetectado || res.usuario?.nome || '',
            crmvDetectado: res.perfil.crmvDetectado || res.usuario?.crmv || '',
            clinicaDetectada: res.perfil.clinicaDetectada || res.usuario?.nomeClinica || '',
            layoutDetectado: res.layout || res.perfil.layoutDetectado || {},
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
    setEtapaAnalise('Enviando arquivos e iniciando análise com Gemini Multimodal...');

    try {
      const formData = new FormData();
      arquivosPdfs.forEach(file => {
        formData.append('pdfs', file);
      });

      const timer1 = setTimeout(() => {
        setEtapaAnalise('Mapeando estrutura de laudo, ordem de órgãos e frases habituais...');
      }, 3500);

      const timer2 = setTimeout(() => {
        setEtapaAnalise('Extraindo tipografia, margens e paleta de cores...');
      }, 7000);

      const res = await api.aprenderPadraoLaudo(formData);
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res && res.sucesso && res.perfilDetectado) {
        const detectado = res.perfilDetectado;
        setPerfilEditando({
          nomeDetectado: detectado.nomeDetectado || userProfile.nome || '',
          crmvDetectado: detectado.crmvDetectado || userProfile.crmv || '',
          clinicaDetectada: detectado.clinicaDetectada || userProfile.nomeClinica || '',
          layoutDetectado: detectado.layoutDetectado || {},
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

        if (onToast) onToast('Padrão identificado com sucesso! Revise os detalhes abaixo e confirme para ativar.', 'success');
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
        layoutDetectado: perfilEditando.layoutDetectado,
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

        // Atualiza estado do perfil do usuário na UI se houve sincronização
        if (setUserProfile) {
          setUserProfile(prev => ({
            ...prev,
            crmv: perfilEditando.atualizarUsuarioCrmv && perfilEditando.crmvDetectado ? perfilEditando.crmvDetectado : prev.crmv,
            nomeClinica: perfilEditando.atualizarUsuarioClinica && perfilEditando.clinicaDetectada ? perfilEditando.clinicaDetectada : prev.nomeClinica,
            nome: perfilEditando.atualizarUsuarioNome && perfilEditando.nomeDetectado ? perfilEditando.nomeDetectado : prev.nome
          }));
        }

        setArquivosPdfs([]);
        if (onToast) onToast('Seu padrão de laudo foi ativado! A partir de agora, seus laudos seguirão este modelo.', 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      if (onToast) onToast(`Erro ao salvar padrão: ${err.message}`, 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleResetarPadrao = async () => {
    if (!window.confirm('Tem certeza de que deseja restaurar o padrão institucional UPA PET? O seu estilo customizado será desativado.')) {
      return;
    }

    setRedefinindo(true);
    try {
      await api.resetPerfilLaudo();
      setPerfilDb(null);
      setPerfilEditando(null);
      setArquivosPdfs([]);
      await carregarPerfil();
      if (onToast) onToast('Padrão institucional UPA PET (Dra. Camila Bastos) restaurado.', 'info');
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
                  Padrão Personalizado Ativo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-500/20 text-slate-400 border border-slate-500/30">
                  Padrão Institucional UPA PET
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {temPerfilAtivo
                ? `A IA Vetaro está calibrada com o seu estilo clínico individual (${perfilDb.nomeDetectado || userProfile.nome} • ${perfilDb.crmvDetectado || userProfile.crmv || 'CRMV'}) baseado em ${perfilDb.quantidadeAmostras || 0} laudo(s) enviado(s).`
                : 'Você está utilizando o padrão oficial UPA PET (Dra. Camila Bastos). Envie até 10 PDFs de seus laudos para que a IA aprenda seu vocabulário, ordem de órgãos, margens e identidade visual.'}
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
              <span>{temPerfilAtivo ? 'Atualizar Padrão com Novos Laudos' : 'Enviar Amostras de Laudos em PDF'}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Envie de 1 a 10 laudos em formato PDF que você já emitiu. Quanto mais laudos, maior a precisão do estilo.
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
            Arquivos suportados: <strong className="text-slate-300">.pdf</strong> (máx. 15MB por arquivo). A IA avaliará o cabeçalho, ordem dos órgãos, frases de normalidade e margens.
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
                <span>Analisar Laudos e Identificar Meu Padrão (IA)</span>
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
              {etapaAnalise || 'Processando laudos com Gemini Multimodal...'}
            </p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              A inteligência artificial está lendo cada página dos seus PDFs para sintetizar seu estilo de laudo, terminologia, fontes e geometria.
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
            <div className="border-b pb-3 border-slate-700/40 flex items-center justify-between">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00D296]" />
                  <span>Revisão e Ajuste do Padrão Identificado</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifique e personalize os dados detectados pela IA antes de salvar o seu padrão oficial.
                </p>
              </div>
            </div>

            {/* SEÇÃO A: DADOS PROFISSIONAIS DETECTADOS */}
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
                    placeholder="Ex: Dra. Camila Bastos"
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
                    placeholder="Ex: CRMV/MG: 22904"
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
                    placeholder="Ex: UPA PET ou Vet Diagnóstico"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                      darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={perfilEditando.atualizarUsuarioCrmv}
                    onChange={(e) => setPerfilEditando({ ...perfilEditando, atualizarUsuarioCrmv: e.target.checked })}
                    className="rounded text-[#00D296] focus:ring-0"
                  />
                  <span>Sincronizar CRMV no meu perfil de usuário</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={perfilEditando.atualizarUsuarioClinica}
                    onChange={(e) => setPerfilEditando({ ...perfilEditando, atualizarUsuarioClinica: e.target.checked })}
                    className="rounded text-[#00D296] focus:ring-0"
                  />
                  <span>Sincronizar Nome da Clínica no meu perfil</span>
                </label>
              </div>
            </div>

            {/* SEÇÃO B: IDENTIDADE VISUAL, TIPOGRAFIA E CORES */}
            <div className="space-y-3 pt-2 border-t border-slate-700/40">
              <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Geometria de Layout, Tipografia e Cores Detectadas</span>
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Família da Fonte
                  </label>
                  <select
                    value={perfilEditando.layoutDetectado?.fontFamily || 'Calibri, sans-serif'}
                    onChange={(e) => setPerfilEditando({
                      ...perfilEditando,
                      layoutDetectado: { ...perfilEditando.layoutDetectado, fontFamily: e.target.value }
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
                    value={perfilEditando.layoutDetectado?.fontSizeBody || '11pt'}
                    onChange={(e) => setPerfilEditando({
                      ...perfilEditando,
                      layoutDetectado: { ...perfilEditando.layoutDetectado, fontSizeBody: e.target.value }
                    })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium ${
                      darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Cor Primária (Títulos)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={perfilEditando.layoutDetectado?.corPrimaria || '#1B365D'}
                      onChange={(e) => setPerfilEditando({
                        ...perfilEditando,
                        layoutDetectado: { ...perfilEditando.layoutDetectado, corPrimaria: e.target.value }
                      })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={perfilEditando.layoutDetectado?.corPrimaria || '#1B365D'}
                      onChange={(e) => setPerfilEditando({
                        ...perfilEditando,
                        layoutDetectado: { ...perfilEditando.layoutDetectado, corPrimaria: e.target.value }
                      })}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Cor Secundária (Barras/Apoio)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={perfilEditando.layoutDetectado?.corSecundaria || '#4A777A'}
                      onChange={(e) => setPerfilEditando({
                        ...perfilEditando,
                        layoutDetectado: { ...perfilEditando.layoutDetectado, corSecundaria: e.target.value }
                      })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={perfilEditando.layoutDetectado?.corSecundaria || '#4A777A'}
                      onChange={(e) => setPerfilEditando({
                        ...perfilEditando,
                        layoutDetectado: { ...perfilEditando.layoutDetectado, corSecundaria: e.target.value }
                      })}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Margens */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Margem Superior
                  </label>
                  <input
                    type="text"
                    value={perfilEditando.layoutDetectado?.marginTop || '20mm'}
                    onChange={(e) => setPerfilEditando({
                      ...perfilEditando,
                      layoutDetectado: { ...perfilEditando.layoutDetectado, marginTop: e.target.value }
                    })}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                      darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Margem Inferior
                  </label>
                  <input
                    type="text"
                    value={perfilEditando.layoutDetectado?.marginBottom || '20mm'}
                    onChange={(e) => setPerfilEditando({
                      ...perfilEditando,
                      layoutDetectado: { ...perfilEditando.layoutDetectado, marginBottom: e.target.value }
                    })}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                      darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Margem Esquerda
                  </label>
                  <input
                    type="text"
                    value={perfilEditando.layoutDetectado?.marginLeft || '15mm'}
                    onChange={(e) => setPerfilEditando({
                      ...perfilEditando,
                      layoutDetectado: { ...perfilEditando.layoutDetectado, marginLeft: e.target.value }
                    })}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                      darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Margem Direita
                  </label>
                  <input
                    type="text"
                    value={perfilEditando.layoutDetectado?.marginRight || '15mm'}
                    onChange={(e) => setPerfilEditando({
                      ...perfilEditando,
                      layoutDetectado: { ...perfilEditando.layoutDetectado, marginRight: e.target.value }
                    })}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                      darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO C: ORDEM SEQUENCIAL DOS ÓRGÃOS */}
            <div className="space-y-3 pt-2 border-t border-slate-700/40">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sequência de Órgãos Laudados ({perfilEditando.ordemOrgaos?.length || 0})</span>
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

              <p className="text-[11px] text-slate-400">
                A IA estruturará os parágrafos do laudo e a ordenação das fotos do exame exatamente nesta sequência:
              </p>

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
                        title="Mover para cima"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === perfilEditando.ordemOrgaos.length - 1}
                        onClick={() => moverOrgao(idx, 1)}
                        className="p-1 hover:text-[#00D296] disabled:opacity-20 text-slate-400"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerOrgao(idx)}
                        className="p-1 hover:text-rose-400 text-slate-400"
                        title="Remover órgão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO D: FRASES DE NORMALIDADE & ESTILO DA CONCLUSÃO */}
            <div className="space-y-3 pt-2 border-t border-slate-700/40">
              <h5 className="text-xs font-black uppercase text-[#00D296] tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>Frases de Normalidade & Estilo da Conclusão</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Formato da Conclusão / Impressões Diagnósticas
                  </label>
                  <textarea
                    rows={3}
                    value={perfilEditando.estiloConclusao}
                    onChange={(e) => setPerfilEditando({ ...perfilEditando, estiloConclusao: e.target.value })}
                    placeholder="Ex: Tópicos numerados com diagnósticos diferenciais em caixa alta..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium resize-none ${
                      darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Observações de Tom e Estilo Clínico da IA
                  </label>
                  <textarea
                    rows={3}
                    value={perfilEditando.observacoesEstilo}
                    onChange={(e) => setPerfilEditando({ ...perfilEditando, observacoesEstilo: e.target.value })}
                    placeholder="Ex: Redação formal, vocabulário objetivo e descritivo..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium resize-none ${
                      darkMode ? 'bg-[#0A141D] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Frases de normalidade por órgão */}
              {perfilEditando.frasesNormalidade && Object.keys(perfilEditando.frasesNormalidade).length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold text-slate-400">
                    Amostras de frases normais identificadas por órgão:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(perfilEditando.frasesNormalidade).map(([orgao, frase]) => (
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
              )}
            </div>

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
                <span>{salvando ? 'Salvando e Ativando Padrão...' : 'Salvar e Ativar Meu Padrão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
