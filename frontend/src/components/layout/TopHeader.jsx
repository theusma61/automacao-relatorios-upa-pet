import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
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
