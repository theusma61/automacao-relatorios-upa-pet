import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Upload,
  Trash2,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export default function ClinicaParceiraModal({
  isOpen,
  onClose,
  clinica = null,
  darkMode = true,
  onSaved,
  onToast
}) {
  const isEditing = Boolean(clinica?.id);
  const logoInputRef = useRef(null);

  const [nome, setNome] = useState('');
  const [nomeContato, setNomeContato] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [valorPadraoUltrassom, setValorPadraoUltrassom] = useState('');
  const [valorPadraoCirurgia, setValorPadraoCirurgia] = useState('');
  const [percentualRepasse, setPercentualRepasse] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [rodapeContato, setRodapeContato] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [usarIdentidadePropria, setUsarIdentidadePropria] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [removerLogo, setRemoverLogo] = useState(false);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErro('');
    setLogoFile(null);
    setRemoverLogo(false);
    if (clinica) {
      setNome(clinica.nome || '');
      setNomeContato(clinica.nomeContato || '');
      setWhatsapp(clinica.whatsapp || '');
      setEmail(clinica.email || '');
      setCidade(clinica.cidade || '');
      setCnpj(clinica.cnpj || '');
      setValorPadraoUltrassom(clinica.valorPadraoUltrassom ? String(clinica.valorPadraoUltrassom) : '');
      setValorPadraoCirurgia(clinica.valorPadraoCirurgia ? String(clinica.valorPadraoCirurgia) : '');
      setPercentualRepasse(clinica.percentualRepasse ? String(clinica.percentualRepasse) : '');
      setDiaFechamento(clinica.diaFechamento ? String(clinica.diaFechamento) : '');
      setRodapeContato(clinica.rodapeContato || '');
      setObservacoes(clinica.observacoes || '');
      setUsarIdentidadePropria(Boolean(clinica.usarIdentidadePropria));
      setLogoPreview(clinica.logoUrl || '');
    } else {
      setNome('');
      setNomeContato('');
      setWhatsapp('');
      setEmail('');
      setCidade('');
      setCnpj('');
      setValorPadraoUltrassom('');
      setValorPadraoCirurgia('');
      setPercentualRepasse('');
      setDiaFechamento('');
      setRodapeContato('');
      setObservacoes('');
      setUsarIdentidadePropria(false);
      setLogoPreview('');
    }
  }, [isOpen, clinica]);

  if (!isOpen) return null;

  const handleSelectLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setRemoverLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setRemoverLogo(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da clínica parceira.');
      return;
    }

    setSaving(true);
    setErro('');
    try {
      const fd = new FormData();
      fd.append('nome', nome.trim());
      fd.append('nomeContato', nomeContato.trim());
      fd.append('whatsapp', whatsapp.trim());
      fd.append('email', email.trim());
      fd.append('cidade', cidade.trim());
      fd.append('cnpj', cnpj.trim());
      fd.append('valorPadraoUltrassom', valorPadraoUltrassom || '0');
      fd.append('valorPadraoCirurgia', valorPadraoCirurgia || '0');
      fd.append('percentualRepasse', percentualRepasse || '0');
      fd.append('diaFechamento', diaFechamento || '');
      fd.append('rodapeContato', rodapeContato.trim());
      fd.append('observacoes', observacoes.trim());
      fd.append('usarIdentidadePropria', String(Boolean(usarIdentidadePropria)));
      if (logoFile) fd.append('logo', logoFile);
      if (removerLogo) fd.append('removerLogo', 'true');

      const res = isEditing
        ? await api.atualizarClinicaParceira(clinica.id, fd)
        : await api.criarClinicaParceira(fd);

      if (onToast) {
        onToast(
          isEditing
            ? `Clínica "${res.clinica?.nome || nome}" atualizada!`
            : `Clínica "${res.clinica?.nome || nome}" cadastrada com sucesso!`
        );
      }
      if (onSaved) onSaved(res.clinica);
      onClose();
    } catch (err) {
      setErro(err?.message || 'Erro ao salvar clínica parceira.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition ${
    darkMode
      ? 'bg-[#0A141D] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#00D296]'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0D5C56]'
  }`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border shadow-2xl ${
          darkMode
            ? 'bg-[#0C1720] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 sticky top-0 z-10 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold">
                {isEditing ? 'Editar Clínica Parceira' : 'Nova Clínica Parceira'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure valores padrão, WhatsApp da recepção e logo opcional nos laudos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border ${
              darkMode
                ? 'border-slate-700 bg-[#0A141D] text-slate-400 hover:text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {erro && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1">Nome da Clínica *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Hospital Veterinário Pet Vida"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">WhatsApp da Clínica / Recepção</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: (31) 99999-8888"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Pessoa de Contato</label>
              <input
                type="text"
                value={nomeContato}
                onChange={(e) => setNomeContato(e.target.value)}
                placeholder="Ex: Dra. Juliana / Financeiro"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: Belo Horizonte - MG"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">CNPJ (opcional)</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className={inputCls}
              />
            </div>
          </div>

          {/* Valores padrão e repasse */}
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className="text-xs font-extrabold text-[#00D296] uppercase tracking-wide">
              Regras Financeiras Padrão
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">Ultrassom (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorPadraoUltrassom}
                  onChange={(e) => setValorPadraoUltrassom(e.target.value)}
                  placeholder="180,00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Cirurgia (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorPadraoCirurgia}
                  onChange={(e) => setValorPadraoCirurgia(e.target.value)}
                  placeholder="450,00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Repasse (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={percentualRepasse}
                  onChange={(e) => setPercentualRepasse(e.target.value)}
                  placeholder="20"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Dia Fechamento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={diaFechamento}
                  onChange={(e) => setDiaFechamento(e.target.value)}
                  placeholder="5"
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              O percentual de repasse é aplicado automaticamente quando você marca que o tutor pagou direto para você.
            </p>
          </div>

          {/* Identidade visual opcional */}
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-extrabold">Identidade Visual da Clínica no Laudo</h4>
                <p className="text-[11px] text-slate-400">
                  Ative se quiser que os PDFs desta clínica saiam com a logo dela no cabeçalho.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={usarIdentidadePropria}
                  onChange={(e) => setUsarIdentidadePropria(e.target.checked)}
                  className="w-4 h-4 accent-[#00D296]"
                />
                <span>Usar logo própria</span>
              </label>
            </div>

            {usarIdentidadePropria && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {logoPreview ? (
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <img
                      src={logoPreview}
                      alt="Logo da clínica"
                      className="h-12 max-w-[160px] object-contain"
                    />
                  </div>
                ) : null}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSelectLogo}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-slate-700 bg-[#0A141D] text-slate-200 hover:border-[#00D296]'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-[#0D5C56]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-[#00D296]" />
                  <span>{logoPreview ? 'Trocar logo' : 'Enviar logo'}</span>
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
                darkMode
                  ? 'border-slate-700 bg-[#0A141D] text-slate-300 hover:text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#052925] hover:brightness-110 transition inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar clínica'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
