import React from 'react';
import { Home, FileText, Settings, Palette } from 'lucide-react';

export default function MobileTabBar({ darkMode, activeNav, setActiveNav, newUiEnabled = false }) {
  return (
    <div
      translate="no"
      className={`notranslate border-t py-2.5 px-2 grid ${
        newUiEnabled ? 'grid-cols-4' : 'grid-cols-3'
      } items-center gap-1 text-[11px] font-bold ${
        darkMode
          ? 'bg-[#0C1720] border-slate-800 text-slate-400'
          : 'bg-white border-slate-200 text-slate-500'
      }`}
    >
      <button
        type="button"
        onClick={() => setActiveNav('inicio')}
        className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 ${
          activeNav === 'inicio' ? 'text-[#00D296]' : ''
        }`}
      >
        <Home className="w-5 h-5 shrink-0" />
        <span className="truncate max-w-full leading-tight">Início</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveNav('ultrassom')}
        className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 ${
          activeNav === 'ultrassom' || activeNav === 'relatorio' ? 'text-[#00D296]' : ''
        }`}
      >
        <FileText className="w-5 h-5 shrink-0" />
        <span className="truncate max-w-full leading-tight">Histórico</span>
      </button>
      {newUiEnabled && (
        <button
          type="button"
          onClick={() => setActiveNav('meus-padroes')}
          className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 ${
            activeNav === 'meus-padroes' ? 'text-[#00D296]' : ''
          }`}
        >
          <Palette className="w-5 h-5 shrink-0" />
          <span className="truncate max-w-full leading-tight">Padrões</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setActiveNav('configuracoes')}
        className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 ${
          activeNav === 'configuracoes' ? 'text-[#00D296]' : ''
        }`}
      >
        <Settings className="w-5 h-5 shrink-0" />
        <span className="truncate max-w-full leading-tight">Configurações</span>
      </button>
    </div>
  );
}
