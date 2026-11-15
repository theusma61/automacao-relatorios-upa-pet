import React from 'react';
import { Home, FileText, Settings } from 'lucide-react';

export default function MobileTabBar({ darkMode, activeNav, setActiveNav }) {
  return (
    <div
      className={`border-t py-3 px-6 flex items-center justify-around text-xs font-bold ${
        darkMode
          ? 'bg-[#0C1720] border-slate-800 text-slate-400'
          : 'bg-white border-slate-200 text-slate-500'
      }`}
    >
      <button
        type="button"
        onClick={() => setActiveNav('inicio')}
        className={`flex flex-col items-center gap-1 ${
          activeNav === 'inicio' ? 'text-[#00D296]' : ''
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Início</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveNav('ultrassom')}
        className={`flex flex-col items-center gap-1 ${
          activeNav === 'ultrassom' || activeNav === 'relatorio' ? 'text-[#00D296]' : ''
        }`}
      >
        <FileText className="w-5 h-5" />
        <span>Histórico</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveNav('configuracoes')}
        className={`flex flex-col items-center gap-1 ${
          activeNav === 'configuracoes' ? 'text-[#00D296]' : ''
        }`}
      >
        <Settings className="w-5 h-5" />
        <span>Configurações</span>
      </button>
    </div>
  );
}
