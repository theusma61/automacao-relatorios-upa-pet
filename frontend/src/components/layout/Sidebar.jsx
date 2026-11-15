import React from 'react';
import {
  Home,
  FileText,
  Settings,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import { VetaroLogo, UltrasoundIcon } from '../icons/VetaroIcons';

export default function Sidebar({
  darkMode,
  activeNav,
  setActiveNav,
  compact = false,
  showWindowDots = true,
  onHelpClick
}) {
  const navItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'ultrassom', label: 'Ultrassom', icon: UltrasoundIcon },
    { id: 'relatorio', label: 'Relatório', icon: FileText },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  return (
    <aside
      className={`${
        compact ? 'w-52 p-5' : 'w-64 p-6'
      } shrink-0 border-r flex flex-col justify-between transition-colors ${
        darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div>
        {showWindowDots && !compact && (
          <div className="flex items-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
        )}

        <div
          onClick={() => setActiveNav('inicio')}
          className={`cursor-pointer ${compact ? 'mb-7' : 'mb-8'} inline-block`}
        >
          <VetaroLogo
            size={compact ? 26 : 34}
            dark={darkMode}
            textSize={compact ? 'text-xl' : 'text-2xl'}
          />
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center ${
                  compact ? 'gap-3 px-3.5 py-2.5 text-xs font-bold' : 'gap-3.5 px-4 py-3 text-sm font-semibold'
                } rounded-xl transition relative ${
                  active
                    ? darkMode
                      ? 'bg-[#0D3131] text-[#00D296]'
                      : 'bg-[#DDF7F0] text-[#0D5C56]'
                    : darkMode
                    ? 'text-slate-300 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#00D296]" />
                )}
                <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        <button
          type="button"
          onClick={onHelpClick}
          className={`w-full flex items-center justify-between ${
            compact ? 'px-3 py-2.5 text-[11px]' : 'px-4 py-3 text-xs'
          } rounded-xl border font-semibold transition ${
            darkMode
              ? 'border-slate-800 bg-[#0F1C26] text-slate-300 hover:border-slate-700'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <HelpCircle className={compact ? 'w-3.5 h-3.5 text-slate-400' : 'w-4 h-4 text-slate-400'} />
            <span>Ajuda e suporte</span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <p className={`${compact ? 'text-[10px] mt-2' : 'text-[11px] mt-3'} text-slate-500 px-1`}>
          v1.0.0
        </p>
      </div>
    </aside>
  );
}
