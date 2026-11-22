import React from 'react';
import { Home, FileText, Settings, Palette } from 'lucide-react';

export default function MobileTabBar({ darkMode, activeNav, setActiveNav, newUiEnabled = false }) {
  if (newUiEnabled) {
    const items = [
      { id: 'inicio', label: 'Início', icon: Home, active: activeNav === 'inicio' },
      {
        id: 'ultrassom',
        label: 'Laudos',
        icon: FileText,
        active: activeNav === 'ultrassom' || activeNav === 'relatorio'
      },
      { id: 'meus-padroes', label: 'Padrões', icon: Palette, active: activeNav === 'meus-padroes' },
      { id: 'configuracoes', label: 'Ajustes', icon: Settings, active: activeNav === 'configuracoes' }
    ];

    return (
      <nav
        translate="no"
        aria-label="Navegação principal"
        className={`notranslate border-t backdrop-blur-xl pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] px-2 grid grid-cols-4 items-center gap-1 transition-colors ${
          darkMode
            ? 'bg-[#0C1720]/95 border-slate-800/90 text-slate-400 shadow-[0_-8px_24px_rgba(0,0,0,0.32)]'
            : 'bg-white/95 border-slate-200 text-slate-500 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]'
        }`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-0 px-1 rounded-xl transition active:scale-95 ${
                item.active
                  ? darkMode
                    ? 'text-[#00D296]'
                    : 'text-[#0D5C56]'
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`px-3.5 py-1 rounded-full transition-colors flex items-center justify-center ${
                  item.active
                    ? darkMode
                      ? 'bg-[#00D296]/15'
                      : 'bg-[#DDF7F0]'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="w-[19px] h-[19px] shrink-0" />
              </span>
              <span className="text-[11px] font-extrabold truncate max-w-full leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div
      translate="no"
      className={`notranslate border-t py-2.5 px-2 grid grid-cols-3 items-center gap-1 text-[11px] font-bold ${
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
