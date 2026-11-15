import React, { useState, useEffect } from 'react';
import { Stethoscope, Trash2, Save } from 'lucide-react';
import { api } from '../../services/api';

export default function ModeloCirurgicoModal({
  darkMode,
  mode, // 'view' | 'form'
  modelo,
  canEdit,
  onClose,
  onSaved,
  onSwitchToEdit,
  onToast
}) {
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    procedimento: '',
    diagnosticoPreCirurgico: '',
    sinonimos: '',
    descricaoProcedimento: '',
    evolucaoConsideracoes: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (modelo) {
      setFormData({
        id: modelo.id || '',
        nome: modelo.nome || '',
        procedimento: modelo.procedimento || modelo.nome || '',
        diagnosticoPreCirurgico: modelo.diagnosticoPreCirurgico || '',
        sinonimos: Array.isArray(modelo.sinonimos)
          ? modelo.sinonimos.join(', ')
          : modelo.sinonimos || '',
        descricaoProcedimento: modelo.descricaoProcedimento || '',
        evolucaoConsideracoes: modelo.evolucaoConsideracoes || ''
      });
    } else {
      setFormData({
        id: '',
        nome: '',
        procedimento: '',
        diagnosticoPreCirurgico: '',
        sinonimos: '',
        descricaoProcedimento: '',
        evolucaoConsideracoes: ''
      });
    }
    setErrorMsg('');
  }, [modelo, mode]);

  if (!mode) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const sinonimosArr = formData.sinonimos
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...(formData.id ? { id: formData.id } : {}),
        nome: formData.nome.trim(),
        procedimento: formData.procedimento.trim(),
        diagnosticoPreCirurgico: formData.diagnosticoPreCirurgico.trim(),
        sinonimos: sinonimosArr,
        descricaoProcedimento: formData.descricaoProcedimento.trim(),
        evolucaoConsideracoes: formData.evolucaoConsideracoes.trim()
      };

      const res = await api.salvarModeloCirurgico(payload);
      onToast(`Modelo "${res.modelo?.nome || payload.nome}" salvo com sucesso!`);
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar modelo cirúrgico.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    if (!window.confirm('Deseja realmente excluir este modelo cirúrgico?')) return;
    try {
      await api.excluirModeloCirurgico(formData.id);
      onToast('Modelo cirúrgico excluído com sucesso.');
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao excluir modelo.');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border p-6 shadow-2xl ${
          darkMode
            ? 'bg-[#121E28] border-slate-700 text-white'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        {mode === 'view' && modelo ? (
          <>
            <div className="flex items-start justify-between pb-3 border-b border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold">{modelo.nome}</h3>
                <p className="text-xs text-[#00D296] font-bold mt-0.5 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>{modelo.procedimento || modelo.nome}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 text-xs leading-relaxed pr-1">
              <div>
                <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1.5">
                  Sinônimos / Palavras-chave:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(modelo.sinonimos) && modelo.sinonimos.length > 0 ? (
                    modelo.sinonimos.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="italic text-slate-400">Nenhum sinônimo cadastrado</span>
                  )}
                </div>
              </div>

              <div>
                <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                  Diagnóstico Pré-Cirúrgico:
                </span>
                <p
                  className={`p-3 rounded-xl border ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {modelo.diagnosticoPreCirurgico || 'Não informado / A critério clínico'}
                </p>
              </div>

              <div>
                <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                  Descrição do Procedimento Cirúrgico (Técnica Padronizada):
                </span>
                <div
                  className={`p-3.5 rounded-xl border whitespace-pre-line ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {modelo.descricaoProcedimento || 'Nenhuma técnica cadastrada.'}
                </div>
              </div>

              <div>
                <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                  Evolução e Considerações:
                </span>
                <p
                  className={`p-3 rounded-xl border ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {modelo.evolucaoConsideracoes || 'Sem considerações adicionais cadastradas.'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">ID: {modelo.id}</span>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onSwitchToEdit(modelo)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/40"
                  >
                    Editar este Modelo
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-500/20 text-slate-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
              <h3 className="text-base font-extrabold">
                {formData.id ? 'Editar Modelo Cirúrgico' : 'Novo Modelo Cirúrgico'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-3.5 text-xs flex-1">
              <div>
                <label className="block font-bold mb-1 text-slate-400">
                  Nome do Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Celiotomia exploratória de urgência"
                  className={`w-full px-3.5 py-2 rounded-xl border font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-400">
                    Procedimento Oficial *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.procedimento}
                    onChange={(e) =>
                      setFormData({ ...formData, procedimento: e.target.value })
                    }
                    placeholder="Ex: Celiotomia exploratória"
                    className={`w-full px-3.5 py-2 rounded-xl border font-semibold ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-400">
                    Diagnóstico Pré-Cirúrgico Padrão
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosticoPreCirurgico}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosticoPreCirurgico: e.target.value })
                    }
                    placeholder="Ex: Corpo estranho gástrico"
                    className={`w-full px-3.5 py-2 rounded-xl border font-semibold ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">
                  Sinônimos / Palavras-chave (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.sinonimos}
                  onChange={(e) => setFormData({ ...formData, sinonimos: e.target.value })}
                  placeholder="Ex: celiotomia, laparotomia, corpo estranho"
                  className={`w-full px-3.5 py-2 rounded-xl border font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">
                  Descrição do Procedimento Cirúrgico (Técnica Padronizada) *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.descricaoProcedimento}
                  onChange={(e) =>
                    setFormData({ ...formData, descricaoProcedimento: e.target.value })
                  }
                  placeholder="Descreva a técnica cirúrgica oficial..."
                  className={`w-full px-3.5 py-2 rounded-xl border font-semibold leading-relaxed ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">
                  Evolução e Considerações Pós-Operatórias
                </label>
                <textarea
                  rows={3}
                  value={formData.evolucaoConsideracoes}
                  onChange={(e) =>
                    setFormData({ ...formData, evolucaoConsideracoes: e.target.value })
                  }
                  placeholder="Considerações sobre o pós-cirúrgico..."
                  className={`w-full px-3.5 py-2 rounded-xl border font-semibold leading-relaxed ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-700/40 flex items-center justify-between">
              {formData.id ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Modelo
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-500/20 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Salvando...' : 'Salvar Modelo'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
