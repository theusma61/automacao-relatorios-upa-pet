import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  MessageCircle,
  Building2,
  QrCode,
  ShieldCheck,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

function formatarDataHoraPtBr(isoString) {
  if (!isoString) return '';
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return '';
  }
}

function normalizarTelefoneWhatsApp(raw = '') {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export default function ShareReportModal({
  isOpen,
  onClose,
  tipo = 'ultrassom',
  documentoId = '',
  pacienteNome = 'Paciente',
  pacienteEspecie = '',
  tutorNome = '',
  procedimento = '',
  darkMode = true,
  onToast,
  onStatusChanged
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [resumoText, setResumoText] = useState('');
  const [resumoOriginal, setResumoOriginal] = useState('');
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [salvandoResumo, setSalvandoResumo] = useState(false);

  const [telefoneDestino, setTelefoneDestino] = useState('');

  const carregarDadosLink = useCallback(async () => {
    if (!isOpen || !documentoId) return;
    setLoading(true);
    setErro('');
    try {
      const res = await api.obterLinkCompartilhamento(tipo, documentoId);
      setDados(res);
      const txt = res?.resumoTutor || '';
      setResumoText(txt);
      setResumoOriginal(txt);
    } catch (err) {
      setErro(err?.message || 'Não foi possível carregar o link de compartilhamento.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, tipo, documentoId]);

  useEffect(() => {
    if (isOpen) {
      carregarDadosLink();
    } else {
      setCopiado(false);
      setErro('');
    }
  }, [isOpen, carregarDadosLink]);

  if (!isOpen) return null;

  const linkAtivo = dados?.linkAtivo !== false;
  const urlPublica = dados?.urlPublica || '';
  const visualizacoes = Number(dados?.visualizacoes || 0);
  const ultimaVis = formatarDataHoraPtBr(dados?.ultimaVisualizacaoEm);
  const resumoModificado = resumoText.trim() !== resumoOriginal.trim();

  const handleCopiarLink = async () => {
    if (!urlPublica) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(urlPublica);
      } else {
        const el = document.createElement('textarea');
        el.value = urlPublica;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
      api.registrarEnvioCompartilhamento(tipo, documentoId).catch(() => {});
      if (onToast) onToast('Link público copiado para a área de transferência!');
    } catch (_) {
      if (onToast) onToast('Não foi possível copiar automaticamente. Selecione o link acima.');
    }
  };

  const handleToggleLinkAtivo = async () => {
    if (!documentoId || togglingStatus) return;
    const proximo = !linkAtivo;
    setTogglingStatus(true);
    try {
      const res = await api.alterarStatusLink(tipo, documentoId, proximo);
      setDados((prev) => (prev ? { ...prev, linkAtivo: res.linkAtivo } : prev));
      if (onStatusChanged) {
        onStatusChanged({ id: dados?.id || documentoId, linkAtivo: res.linkAtivo });
      }
      if (onToast) {
        onToast(
          res.linkAtivo
            ? 'Link público reativado com sucesso.'
            : 'Link público desativado (acesso externo bloqueado).'
        );
      }
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao alterar status do link.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleGerarResumoIA = async (forcarRegeneracao = false) => {
    if (!documentoId || gerandoResumo) return;
    setGerandoResumo(true);
    setErro('');
    try {
      const res = await api.gerarResumoTutor(tipo, documentoId, forcarRegeneracao);
      const novoTexto = res?.resumoTutor || '';
      setResumoText(novoTexto);
      setResumoOriginal(novoTexto);
      setDados((prev) => (prev ? { ...prev, resumoTutor: novoTexto } : prev));
      if (onToast) onToast('Resumo em linguagem simples pronto para revisão!');
    } catch (err) {
      const msg = err?.message || 'Erro ao gerar resumo com IA.';
      setErro(msg);
      if (onToast) onToast(msg);
    } finally {
      setGerandoResumo(false);
    }
  };

  const handleSalvarResumo = async () => {
    if (!documentoId || salvandoResumo) return;
    setSalvandoResumo(true);
    try {
      const res = await api.salvarResumoTutor(tipo, documentoId, resumoText);
      const salvo = res?.resumoTutor || '';
      setResumoText(salvo);
      setResumoOriginal(salvo);
      setDados((prev) => (prev ? { ...prev, resumoTutor: salvo } : prev));
      if (onToast) onToast('Resumo para o tutor salvo com sucesso!');
    } catch (err) {
      if (onToast) onToast(err?.message || 'Erro ao salvar resumo.');
    } finally {
      setSalvandoResumo(false);
    }
  };

  const abrirWhatsApp = (destino) => {
    if (!urlPublica) return;
    if (!linkAtivo) {
      if (onToast) onToast('Reative o link público antes de enviar pelo WhatsApp.');
      return;
    }

    const tipoLabel = tipo === 'cirurgia' ? 'relatório cirúrgico' : 'laudo de ultrassonografia';
    const nomeLimpo = pacienteNome || 'seu pet';
    const resumoLimpo = resumoText.trim();

    let mensagem = '';
    if (destino === 'tutor') {
      const saudacao = tutorNome ? `Olá, ${tutorNome}!` : 'Olá!';
      mensagem = [
        `${saudacao} Segue o ${tipoLabel} do(a) ${nomeLimpo}.`,
        resumoLimpo ? `\n${resumoLimpo}` : '',
        `\nAcesse o documento completo em PDF pelo link:\n${urlPublica}`
      ].filter(Boolean).join('\n');
    } else {
      const detalheClinico = [
        pacienteEspecie ? `(${pacienteEspecie})` : '',
        tipo === 'cirurgia' && procedimento ? `— ${procedimento}` : ''
      ].filter(Boolean).join(' ');
      mensagem = [
        `Olá! Segue o ${tipoLabel} do paciente ${nomeLimpo}${detalheClinico ? ` ${detalheClinico}` : ''}.`,
        `\nLink direto para visualização e download do PDF:\n${urlPublica}`
      ].join('\n');
    }

    const telefoneEfetivo =
      telefoneDestino.trim() ||
      (destino === 'clinica' ? (dados?.clinicaParceira?.whatsapp || '') : '');
    const phone = normalizarTelefoneWhatsApp(telefoneEfetivo);
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;

    api.registrarEnvioCompartilhamento(tipo, documentoId).catch(() => {});
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border shadow-2xl transition ${
          darkMode
            ? 'bg-[#0C1720] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 sticky top-0 z-10 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#00D296]/15 text-[#00D296] flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                Compartilhar {tipo === 'cirurgia' ? 'Relatório Cirúrgico' : 'Laudo Digital'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {pacienteNome}{pacienteEspecie ? ` • ${pacienteEspecie}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de compartilhamento"
            className={`p-2 rounded-xl border transition ${
              darkMode
                ? 'border-slate-700 bg-[#0A141D] text-slate-400 hover:text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-[#00D296]" />
              <p className="text-xs font-semibold">Preparando link seguro e QR Code...</p>
            </div>
          ) : (
            <>
              {erro && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {/* Bloco 1: Link Público, QR Code e Status LGPD */}
              <div
                className={`rounded-2xl border p-4 space-y-3.5 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {visualizacoes > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00D296]/15 text-[#00D296]">
                        <Eye className="w-3.5 h-3.5" />
                        Visualizado {visualizacoes}x{ultimaVis ? ` · ${ultimaVis}` : ''}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                          darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/80 text-slate-600'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Aguardando visualização
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={togglingStatus || !dados}
                    onClick={handleToggleLinkAtivo}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition disabled:opacity-50 ${
                      linkAtivo
                        ? darkMode
                          ? 'border-[#00D296]/40 bg-[#00D296]/10 text-[#00D296] hover:bg-[#00D296]/20'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : darkMode
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {linkAtivo ? <ShieldCheck className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{linkAtivo ? 'Link ativo' : 'Link desativado'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {dados?.qrCodeDataUri ? (
                    <div className="p-1.5 rounded-xl bg-white border border-slate-200 shrink-0">
                      <img
                        src={dados.qrCodeDataUri}
                        alt="QR Code do laudo"
                        className="w-16 h-16 block"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-xl border flex items-center justify-center shrink-0 ${
                        darkMode ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      <QrCode className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      readOnly
                      value={urlPublica}
                      onFocus={(e) => e.target.select()}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                        darkMode
                          ? 'bg-[#0A141D] border-slate-700 text-slate-200'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopiarLink}
                        disabled={!urlPublica}
                        className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] hover:brightness-110 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiado ? 'Link copiado!' : 'Copiar link'}</span>
                      </button>
                      {urlPublica && (
                        <a
                          href={urlPublica}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition ${
                            darkMode
                              ? 'border-slate-700 bg-[#0A141D] text-slate-200 hover:border-[#00D296]'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-[#0D5C56]'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Resumo Empático para o Tutor (IA) */}
              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#00D296]" />
                      <span>Resumo em linguagem simples para o tutor</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Opcional — aparece na página pública e acompanha a mensagem do WhatsApp.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={gerandoResumo || !dados}
                    onClick={() => handleGerarResumoIA(Boolean(resumoText.trim()))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition disabled:opacity-50 ${
                      darkMode
                        ? 'border-[#00D296]/40 bg-[#00D296]/10 text-[#00D296] hover:bg-[#00D296]/20'
                        : 'border-teal-300 bg-teal-50 text-[#0D5C56] hover:bg-teal-100'
                    }`}
                  >
                    {gerandoResumo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{resumoText.trim() ? 'Regerar com IA' : 'Gerar com IA'}</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={resumoText}
                  onChange={(e) => setResumoText(e.target.value)}
                  placeholder="Clique em 'Gerar com IA' para traduzir os achados técnicos para uma explicação acolhedora ao tutor, ou escreva sua própria mensagem..."
                  className={`w-full rounded-xl p-3 text-xs sm:text-sm leading-relaxed border outline-none resize-y ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#00D296]'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#0D5C56]'
                  }`}
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Revise antes de enviar. Não substitui a avaliação do médico veterinário responsável.
                  </span>
                  {resumoModificado && (
                    <button
                      type="button"
                      disabled={salvandoResumo}
                      onClick={handleSalvarResumo}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#0D5C56] text-white hover:brightness-110 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{salvandoResumo ? 'Salvando...' : 'Salvar resumo'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bloco 3: Envio em 1 Clique no WhatsApp */}
              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <label className="block text-xs font-extrabold mb-1.5">
                    WhatsApp do destinatário (opcional, com DDD)
                  </label>
                  <input
                    type="tel"
                    value={telefoneDestino}
                    onChange={(e) => setTelefoneDestino(e.target.value)}
                    placeholder="Ex: (31) 99999-8888 — ou deixe em branco para escolher o contato no WhatsApp"
                    className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm border outline-none ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#00D296]'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#0D5C56]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={!urlPublica || !linkAtivo}
                    onClick={() => abrirWhatsApp('tutor')}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] hover:brightness-110 transition inline-flex items-center justify-center gap-2 disabled:opacity-45"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar para o Tutor</span>
                  </button>

                  <button
                    type="button"
                    disabled={!urlPublica || !linkAtivo}
                    onClick={() => abrirWhatsApp('clinica')}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-extrabold border transition inline-flex items-center justify-center gap-2 disabled:opacity-45 ${
                      darkMode
                        ? 'border-slate-700 bg-[#0A141D] text-slate-100 hover:border-[#00D296]'
                        : 'border-slate-300 bg-white text-[#0A141D] hover:border-[#0D5C56]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#00D296]" />
                    <span>
                      {dados?.clinicaParceira?.nome
                        ? `Enviar p/ ${dados.clinicaParceira.nome.slice(0, 18)}`
                        : 'Enviar para Clínica'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
