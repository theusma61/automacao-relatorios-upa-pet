import React from 'react';
import {
  User,
  Settings,
  LogOut,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { PlanBoxIcon, MoonStarIcon } from '../icons/VetaroIcons';

export default function ProfileDropdown({
  isStandalone = false,
  darkMode,
  setDarkMode,
  userProfile,
  activeNav,
  settingsTab,
  onSelectTab,
  newUiEnabled = false,
  onToggleNewUi,
  onOpenAdminModal,
  onLogout
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`${
        isStandalone ? 'w-72' : 'absolute right-0 top-14 w-72 z-50'
      } rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        darkMode
          ? 'bg-[#121E28] border-[#243647] text-white shadow-black/80'
          : 'bg-white border-slate-200 text-[#0A141D] shadow-slate-900/20'
      }`}
    >
      {/* Cabeçalho MD + Nome + E-mail */}
      <div className="p-5 flex items-center gap-3.5">
        {userProfile.foto ? (
          <img
            src={userProfile.foto}
            alt={userProfile.name}
            className="w-12 h-12 rounded-full object-cover border border-[#00D296]/40 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#637692] text-white flex items-center justify-center font-bold text-base shrink-0">
            {userProfile.initials || 'MD'}
          </div>
        )}
        <div className="min-w-0 text-left flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-base leading-tight truncate">{userProfile.name}</p>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#00D296]/20 text-[#00D296] shrink-0">
              {userProfile.plano === 'CLINICA' ? 'Clínica' : userProfile.plano === 'PRO' ? 'Pro' : userProfile.plano === 'SOLO' ? 'Solo' : 'Degustação (10)'}
            </span>
          </div>
          <p
            className={`text-xs mt-0.5 truncate ${
              darkMode ? 'text-slate-300/80' : 'text-slate-500'
            }`}
          >
            {userProfile.email}
          </p>
        </div>
      </div>

      <div className={`h-px mx-4 ${darkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

      {/* Opções clicáveis: Meu perfil, Plano e assinatura, Configurações (+ Admin se aplicável) */}
      <div className="p-2.5 space-y-1">
        <button
          type="button"
          onClick={() => onSelectTab('perfil')}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeNav === 'configuracoes' && settingsTab === 'perfil'
              ? 'bg-[#00D296]/15 text-[#00D296]'
              : darkMode
              ? 'text-slate-100 hover:bg-white/5'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <User className="w-5 h-5 stroke-[1.9]" />
          <span>Meu perfil</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('assinatura')}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeNav === 'configuracoes' && settingsTab === 'assinatura'
              ? 'bg-[#00D296]/15 text-[#00D296]'
              : darkMode
              ? 'text-slate-100 hover:bg-white/5'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <PlanBoxIcon className="w-5 h-5" />
          <span>Plano e assinatura</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('preferencias')}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeNav === 'configuracoes' && settingsTab === 'preferencias'
              ? 'bg-[#00D296]/15 text-[#00D296]'
              : darkMode
              ? 'text-slate-100 hover:bg-white/5'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-5 h-5 stroke-[1.9]" />
          <span>Configurações</span>
        </button>

        {userProfile.role === 'admin' && onOpenAdminModal && (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              darkMode
                ? 'text-slate-100 hover:bg-white/5'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-5 h-5 stroke-[1.9] text-[#00D296]" />
            <span>Acessos (Admin)</span>
          </button>
        )}
      </div>

      <div className={`h-px mx-4 ${darkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

      {/* Nova Interface (Beta) + Modo Escuro Toggle + Sair */}
      <div className="p-2.5 space-y-1">
        {onToggleNewUi && (
          <div
            onClick={() => onToggleNewUi(!newUiEnabled)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ${
              darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Sparkles className="w-5 h-5 text-[#00D296] shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate">Nova interface</span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#00D296]/20 text-[#00D296]">
                  Beta
                </span>
              </div>
            </div>

            <div
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
                newUiEnabled ? 'bg-[#00D296]' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200"
                style={{
                  transform: newUiEnabled ? 'translateX(22px)' : 'translateX(2px)'
                }}
              />
            </div>
          </div>
        )}

        <div
          onClick={() => setDarkMode(!darkMode)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ${
            darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <MoonStarIcon className="w-5 h-5" />
            <span>Modo escuro</span>
          </div>

          <div
            className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
              darkMode ? 'bg-[#00D296]' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200"
              style={{
                transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            darkMode
              ? 'text-slate-100 hover:bg-rose-500/15 hover:text-rose-300'
              : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <LogOut className="w-5 h-5 stroke-[1.9]" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
