import React from 'react';
import {
  FileText,
  ArrowRight,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { UltrasoundIcon, CardWaveBackground } from '../components/icons/VetaroIcons';

export default function DashboardHome({
  darkMode,
  isTabletLayout = false,
  isMobileLayout = false,
  activities = [],
  loadingHistory = false,
  onRefreshHistory,
  onNavigate,
  onSelectReport
}) {
  return (
    <div className="space-y-7">
      {isTabletLayout ? (
        <div className="space-y-4">
          <div
            className={`relative rounded-2xl p-6 border flex items-center gap-6 overflow-hidden transition ${
              darkMode
                ? 'bg-gradient-to-r from-[#132530] to-[#0E3130] border-teal-500/20'
                : 'bg-gradient-to-r from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
            }`}
          >
            <CardWaveBackground dark={darkMode} />
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ${
                darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]'
              }`}
            >
              <UltrasoundIcon className="w-10 h-10" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold">Ultrassom</h3>
              <p
                className={`text-sm max-w-md my-1.5 ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Envie suas imagens e receba um laudo completo com IA.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('ultrassom')}
                className={`mt-2 px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition shadow-sm ${
                  darkMode
                    ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                    : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                }`}
              >
                Começar agora <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`relative rounded-2xl p-6 border flex items-center gap-6 overflow-hidden transition ${
              darkMode
                ? 'bg-gradient-to-r from-[#13232F] to-[#0F2C30] border-teal-500/20'
                : 'bg-gradient-to-r from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
            }`}
          >
            <CardWaveBackground dark={darkMode} />
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ${
                darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]'
              }`}
            >
              <FileText className="w-9 h-9" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold">Relatório</h3>
              <p
                className={`text-sm max-w-md my-1.5 ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Envie seu documento e gere um relatório personalizado.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('relatorio')}
                className={`mt-2 px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition shadow-sm ${
                  darkMode
                    ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                    : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                }`}
              >
                Começar agora <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`grid ${isMobileLayout ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
          <div
            className={`relative rounded-2xl ${
              isMobileLayout ? 'p-5' : 'p-7'
            } border overflow-hidden transition ${
              darkMode
                ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/20'
                : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
            }`}
          >
            <CardWaveBackground dark={darkMode} />
            <div className="relative z-10">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                  darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]'
                }`}
              >
                <UltrasoundIcon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold">Ultrassom</h3>
              <p
                className={`text-sm mt-1.5 mb-6 max-w-xs leading-relaxed ${
                  darkMode ? 'text-slate-300' : 'text-[#3F5368]'
                }`}
              >
                Envie suas imagens e receba um laudo completo com IA.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('ultrassom')}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm ${
                  darkMode
                    ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                    : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                }`}
              >
                Começar agora <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`relative rounded-2xl ${
              isMobileLayout ? 'p-5' : 'p-7'
            } border overflow-hidden transition ${
              darkMode
                ? 'bg-gradient-to-br from-[#13232F] to-[#0F2C30] border-teal-500/20'
                : 'bg-gradient-to-br from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
            }`}
          >
            <CardWaveBackground dark={darkMode} />
            <div className="relative z-10">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                  darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]'
                }`}
              >
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold">Relatório</h3>
              <p
                className={`text-sm mt-1.5 mb-6 max-w-xs leading-relaxed ${
                  darkMode ? 'text-slate-300' : 'text-[#3F5368]'
                }`}
              >
                Envie seu documento e gere um relatório personalizado.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('relatorio')}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm ${
                  darkMode
                    ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                    : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                }`}
              >
                Começar agora <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela Atividade Recente (100% PostgreSQL) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold">Atividade recente</h3>
            {onRefreshHistory && (
              <button
                type="button"
                onClick={onRefreshHistory}
                title="Sincronizar histórico com PostgreSQL"
                className={`p-1.5 rounded-lg border text-xs transition ${
                  darkMode
                    ? 'border-slate-800 bg-[#0E1A24] text-slate-400 hover:text-[#00D296]'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-[#0D5C56]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {activities.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectReport(activities[0])}
              className={`text-xs font-bold inline-flex items-center gap-1 hover:underline ${
                darkMode ? 'text-[#00D296]' : 'text-[#0D5C56]'
              }`}
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div
          className={`rounded-2xl border divide-y overflow-hidden ${
            darkMode
              ? 'bg-[#0E1A24] border-slate-800/90 divide-slate-800/80'
              : 'bg-white border-slate-200 divide-slate-100'
          }`}
        >
          {activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {loadingHistory
                ? 'Carregando histórico do PostgreSQL...'
                : 'Nenhum laudo de ultrassom ou relatório cirúrgico emitido ainda.'}
            </div>
          ) : (
            activities.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectReport(item)}
                className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                  darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-100 text-[#0A141D]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs sm:text-sm font-bold truncate">
                      {item.title}
                      {item.patient ? (
                        <span className="font-normal opacity-80"> — {item.patient}</span>
                      ) : null}
                    </p>
                    {isMobileLayout && (
                      <p className="text-[10px] text-slate-400 truncate">{item.date}</p>
                    )}
                  </div>
                </div>

                {!isMobileLayout && (
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      darkMode ? 'text-slate-400' : 'text-[#637692]'
                    }`}
                  >
                    {item.date}
                  </span>
                )}

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      darkMode
                        ? 'bg-[#0D4A3E] text-[#2CE5B1]'
                        : 'bg-[#D3F7E9] text-[#0D684E]'
                    }`}
                  >
                    {item.status}
                  </span>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
