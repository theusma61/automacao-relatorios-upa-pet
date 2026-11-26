import React from 'react';
import { Bell, ChevronDown, FlaskConical, Sparkles } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

export default function TopHeader({
  darkMode,
  setDarkMode,
  userProfile,
  activeNav,
  settingsTab,
  profileMenuOpen,
  setProfileMenuOpen,
  onSelectTab,
  onOpenAdminModal,
  onLogout,
  onBellClick,
  newUiEnabled = false,
  onToggleNewUi,
  localMockState = null,
  onToggleLocalMock,
  compact = false
}) {
  return (
    <header className={`flex items-start justify-between ${compact ? 'mb-6' : 'mb-7'} relative`}>
      <div>
        <h1 className={`${compact ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>
          Olá, {userProfile.greetingName}!
        </h1>
        <p
          className={`${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'} font-medium ${
            darkMode ? 'text-slate-400' : 'text-[#52657A]'
          }`}
        >
          Tudo pronto para otimizar seu trabalho hoje?
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 relative">
        {localMockState?.disponivel && onToggleLocalMock && (
          <button
            type="button"
            disabled={localMockState.salvando}
            onClick={onToggleLocalMock}
            title={
              localMockState.ativo
                ? 'Modo Simulação Local ativo (0 tokens). Clique para ativar chamadas reais à IA Gemini.'
                : 'IA Real Gemini ativa neste ambiente local (consome tokens). Clique para voltar à simulação de 0 tokens.'
            }
            className={`px-3 py-1.5 rounded-full border text-xs font-extrabold inline-flex items-center gap-1.5 transition shrink-0 ${
              localMockState.ativo
                ? darkMode
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : darkMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {localMockState.ativo ? (
              <>
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Local · IA Simulada (0 tokens)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Local · IA Real (Gemini)</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onBellClick}
          className="p-2 rounded-full hover:bg-slate-500/10 relative"
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#00D296]" />
        </button>

        <button
          type="button"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex items-center gap-2"
        >
          {userProfile.foto ? (
            <img
              src={userProfile.foto}
              alt={userProfile.name}
              className={`${
                compact ? 'w-9 h-9' : 'w-10 h-10'
              } rounded-full object-cover border border-[#00D296]/40`}
            />
          ) : (
            <div
              className={`${
                compact ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'
              } rounded-full flex items-center justify-center font-bold ${
                darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
              }`}
            >
              {userProfile.initials || 'MD'}
            </div>
          )}
          <ChevronDown className="w-4 h-4" />
        </button>

        {profileMenuOpen && (
          <ProfileDropdown
            isStandalone={false}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            userProfile={userProfile}
            activeNav={activeNav}
            settingsTab={settingsTab}
            onSelectTab={onSelectTab}
            newUiEnabled={newUiEnabled}
            onToggleNewUi={onToggleNewUi}
            onOpenAdminModal={onOpenAdminModal}
            onLogout={onLogout}
          />
        )}
      </div>
    </header>
  );
}
