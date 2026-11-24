import React, { useState, useEffect } from 'react';
import { Building2, Wallet } from 'lucide-react';
import { api } from '../services/api';

const STORAGE_KEY = 'vetaro_ultima_clinica_parceira';

export default function VolanteSelectorBar({
  tipo = 'ultrassom',
  darkMode = true,
  value = { clinicaParceiraId: '', valorExame: '', quemPagou: 'CLINICA' },
  onChange
}) {
  const [clinicas, setClinicas] = useState([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .listarClinicasParceiras()
      .then((res) => {
        if (!ativo) return;
        const lista = Array.isArray(res?.clinicas) ? res.clinicas : [];
        setClinicas(lista);
        setCarregado(true);

        // Restaura última clínica usada no plantão se o campo ainda estiver vazio
        if (lista.length > 0 && !value?.clinicaParceiraId && onChange) {
          try {
            const ultimaId = localStorage.getItem(STORAGE_KEY) || '';
            const match = lista.find((c) => c.id === ultimaId);
            if (match) {
              const padrao =
                tipo === 'cirurgia'
                  ? match.valorPadraoCirurgia
                  : match.valorPadraoUltrassom;
              onChange({
                clinicaParceiraId: match.id,
                valorExame: padrao > 0 ? String(padrao) : '',
                quemPagou: value?.quemPagou || 'CLINICA'
              });
            }
          } catch (_) {}
        }
      })
      .catch(() => {
        if (ativo) setCarregado(true);
      });
    return () => {
      ativo = false;
    };
  }, [tipo]);

  const clinicaAtual = clinicas.find((c) => c.id === value?.clinicaParceiraId) || null;
  const valorNum = Number(String(value?.valorExame || '').replace(',', '.')) || 0;
  const repassePct = Number(clinicaAtual?.percentualRepasse || 0);
  const repasseEstimado =
    value?.quemPagou === 'TUTOR' && valorNum > 0 && repassePct > 0
      ? ((valorNum * repassePct) / 100).toFixed(2).replace('.', ',')
      : null;

  const handleSelectClinica = (novaId) => {
    try {
      if (novaId) localStorage.setItem(STORAGE_KEY, novaId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}

    const encontrada = clinicas.find((c) => c.id === novaId);
    const valorPadrao = encontrada
      ? tipo === 'cirurgia'
        ? encontrada.valorPadraoCirurgia
        : encontrada.valorPadraoUltrassom
      : 0;

    if (onChange) {
      onChange({
        clinicaParceiraId: novaId,
        valorExame: valorPadrao > 0 ? String(valorPadrao) : '',
        quemPagou: value?.quemPagou || 'CLINICA'
      });
    }
  };

  if (!carregado || clinicas.length === 0) return null;

  return (
    <div
      className={`relative z-10 mt-4 rounded-xl border p-3 sm:p-3.5 transition ${
        darkMode
          ? 'bg-[#0A141D]/80 border-slate-800 text-slate-200'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#00D296] inline-flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Modo Volante (Opcional)
        </span>
        {clinicaAtual?.usarIdentidadePropria && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D296]/15 text-[#00D296]">
            Logo da clínica ativa no PDF
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        <div className="sm:col-span-5">
          <select
            value={value?.clinicaParceiraId || ''}
            onChange={(e) => handleSelectClinica(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none ${
              darkMode
                ? 'bg-[#0F1C26] border-slate-700 text-slate-100 focus:border-[#00D296]'
                : 'bg-white border-slate-300 text-slate-900 focus:border-[#0D5C56]'
            }`}
          >
            <option value="">Atendimento particular / Sem clínica</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
            R$
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={value?.valorExame || ''}
            onChange={(e) =>
              onChange && onChange({ ...value, valorExame: e.target.value })
            }
            placeholder="Valor"
            className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs font-bold border outline-none ${
              darkMode
                ? 'bg-[#0F1C26] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#00D296]'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0D5C56]'
            }`}
          />
        </div>

        <div className="sm:col-span-4 flex rounded-xl overflow-hidden border border-slate-700/60">
          <button
            type="button"
            onClick={() => onChange && onChange({ ...value, quemPagou: 'CLINICA' })}
            className={`flex-1 py-2 px-2 text-[11px] font-extrabold transition ${
              (value?.quemPagou || 'CLINICA') === 'CLINICA'
                ? 'bg-[#00D296] text-[#052925]'
                : darkMode
                ? 'bg-[#0F1C26] text-slate-400 hover:text-white'
                : 'bg-white text-slate-600'
            }`}
          >
            Clínica paga
          </button>
          <button
            type="button"
            onClick={() => onChange && onChange({ ...value, quemPagou: 'TUTOR' })}
            className={`flex-1 py-2 px-2 text-[11px] font-extrabold transition ${
              value?.quemPagou === 'TUTOR'
                ? 'bg-[#00D296] text-[#052925]'
                : darkMode
                ? 'bg-[#0F1C26] text-slate-400 hover:text-white'
                : 'bg-white text-slate-600'
            }`}
          >
            Tutor pagou
          </button>
        </div>
      </div>

      {repasseEstimado && (
        <p className="mt-2 text-[11px] text-amber-400 font-semibold flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          <span>
            Repasse automático para {clinicaAtual?.nome}: R$ {repasseEstimado} ({repassePct}%)
          </span>
        </p>
      )}
    </div>
  );
}
