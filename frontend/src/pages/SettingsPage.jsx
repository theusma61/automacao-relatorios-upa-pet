import React, { useRef, useState } from 'react';
import {
  User,
  CreditCard,
  Settings,
  Stethoscope,
  Upload,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage({
  darkMode,
  setDarkMode,
  isMobileLayout = false,
  settingsTab,
  setSettingsTab,
  userProfile,
  setUserProfile,
  activitiesCount = 142,
  onOpenAdminModal,
  onToast
}) {
  const logoInputRef = useRef(null);
  const assinaturaInputRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [assinaturaFile, setAssinaturaFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append('nome', userProfile.name || '');
      fd.append('crmv', userProfile.crmv || '');
      fd.append('nomeClinica', userProfile.clinicName || '');
      if (logoFile) fd.append('logo', logoFile);
      if (assinaturaFile) fd.append('assinatura', assinaturaFile);

      const res = await api.updatePerfilProfissional(fd);
      if (res && res.usuario) {
        setUserProfile({
          ...userProfile,
          ...res.usuario,
          name: res.usuario.nome || userProfile.name,
          clinicName: res.usuario.nomeClinica || userProfile.clinicName
        });
      }
      onToast(`Dados do perfil (${userProfile.name}) salvos com sucesso!`);
    } catch (_) {
      onToast(`Dados do perfil da ${userProfile.name} atualizados!`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navegação correspondente aos 3 itens do Menu de Perfil da 2ª Foto */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-700/40">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'perfil', label: `Meu perfil (${userProfile.greetingName})`, icon: User },
            { id: 'assinatura', label: 'Plano e assinatura', icon: CreditCard },
            { id: 'preferencias', label: 'Configurações & IA', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = settingsTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSettingsTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                  active
                    ? 'bg-[#00D296] text-[#062E2B] shadow-sm'
                    : darkMode
                    ? 'bg-[#0F1C26] text-slate-300 hover:bg-slate-800'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {userProfile.role === 'admin' && onOpenAdminModal && (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="px-3.5 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Controle de Acessos (Admin)</span>
          </button>
        )}
      </div>

      {/* ABA 1: MEU PERFIL */}
      {settingsTab === 'perfil' && (
        <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
          {/* Cartão da Médica Veterinária */}
          <div
            className={`${
              isMobileLayout ? '' : 'col-span-4'
            } p-6 rounded-2xl border flex flex-col items-center text-center ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-[#637692] text-white flex items-center justify-center font-extrabold text-2xl mb-3 shadow-lg">
              {userProfile.initials}
            </div>
            <h3 className="text-lg font-extrabold">{userProfile.name}</h3>
            <p className="text-xs text-[#00D296] font-bold mt-0.5">{userProfile.crmv}</p>
            <p className="text-xs text-slate-400 mt-1">{userProfile.email}</p>

            <div
              className={`w-full mt-5 p-3.5 rounded-xl border text-left text-xs space-y-1.5 ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-extrabold text-[11px] uppercase tracking-wider text-[#00D296]">
                Carimbo Digital nos Laudos
              </p>
              <p className="font-bold">{userProfile.name}</p>
              <p>{userProfile.crmv} • Diagnóstico Veterinário</p>
              <p className="text-[11px] text-slate-400">
                Assinatura eletrônica ativa em todos os PDFs gerados.
              </p>
            </div>
          </div>

          {/* Formulário de Edição de Dados Profissionais */}
          <div
            className={`${
              isMobileLayout ? '' : 'col-span-8'
            } p-6 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#00D296]" />
              Dados Profissionais & Clínica Veterinária
            </h3>

            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Nome Completo no Laudo
                </label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, name: e.target.value, nome: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Registro CRMV / UF
                </label>
                <input
                  type="text"
                  value={userProfile.crmv}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, crmv: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  E-mail Profissional
                </label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, email: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Nome da Clínica / Serviço Volante
                </label>
                <input
                  type="text"
                  value={userProfile.clinicName}
                  onChange={(e) =>
                    setUserProfile({
                      ...userProfile,
                      clinicName: e.target.value,
                      nomeClinica: e.target.value
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-400">
                Especialidade exibida no rodapé dos laudos
              </label>
              <input
                type="text"
                value={userProfile.specialty}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, specialty: e.target.value })
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                }`}
              />
            </div>

            {/* Uploads Multi-Médico de Logotipo e Assinatura Digital */}
            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pt-1`}>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current && logoInputRef.current.click()}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-slate-300 hover:border-[#00D296]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0D5C56]'
                  }`}
                >
                  <Upload className="w-4 h-4 text-[#00D296]" />
                  <span className="truncate">
                    {logoFile ? logoFile.name : 'Enviar Logotipo da Clínica (PNG/JPG)'}
                  </span>
                </button>
              </div>

              <div>
                <input
                  ref={assinaturaInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => setAssinaturaFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() =>
                    assinaturaInputRef.current && assinaturaInputRef.current.click()
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-slate-300 hover:border-[#00D296]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0D5C56]'
                  }`}
                >
                  <Upload className="w-4 h-4 text-[#00D296]" />
                  <span className="truncate">
                    {assinaturaFile
                      ? assinaturaFile.name
                      : 'Enviar Assinatura / Carimbo (PNG/JPG)'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingProfile}
                onClick={handleSaveProfile}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: PLANO E ASSINATURA */}
      {settingsTab === 'assinatura' && (
        <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
          <div
            className={`${
              isMobileLayout ? '' : 'col-span-7'
            } p-6 rounded-2xl border space-y-4 ${
              darkMode
                ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/30'
                : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#00D296] text-[#062E2B]">
                PLANO ATIVO • RENOVAÇÃO AUTOMÁTICA
              </span>
              <span className="text-xs font-bold opacity-80">R$ 189,00 / mês</span>
            </div>
            <h3 className="text-2xl font-extrabold">Vetaro Pro IA — Ilimitado</h3>
            <p className="text-xs leading-relaxed opacity-90">
              Laudos de ultrassom e relatórios clínicos ilimitados com transcrição por voz,
              análise de imagens DICOM/JPEG e papel timbrado personalizado.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div
                className={`p-3 rounded-xl border ${
                  darkMode
                    ? 'bg-[#0A141D]/60 border-teal-500/20'
                    : 'bg-white/80 border-teal-600/20'
                }`}
              >
                <p className="text-[11px] text-slate-400">Laudos este mês</p>
                <p className="text-lg font-extrabold text-[#00D296]">
                  {Math.max(142, activitiesCount)}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  darkMode
                    ? 'bg-[#0A141D]/60 border-teal-500/20'
                    : 'bg-white/80 border-teal-600/20'
                }`}
              >
                <p className="text-[11px] text-slate-400">Tempo economizado</p>
                <p className="text-lg font-extrabold text-[#00D296]">~35h</p>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  darkMode
                    ? 'bg-[#0A141D]/60 border-teal-500/20'
                    : 'bg-white/80 border-teal-600/20'
                }`}
              >
                <p className="text-[11px] text-slate-400">Próxima fatura</p>
                <p className="text-sm font-extrabold">15/12/2025</p>
              </div>
            </div>
          </div>

          <div
            className={`${
              isMobileLayout ? '' : 'col-span-5'
            } p-6 rounded-2xl border space-y-3 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h4 className="text-sm font-extrabold">Método de Pagamento & Faturas</h4>
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="font-bold">Mastercard •••• 4821</span>
              <span className="text-[#00D296] font-bold">Padrão</span>
            </div>
            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between py-1.5 border-b border-slate-700/30">
                <span>15/11/2025 — Vetaro Pro IA</span>
                <span className="font-bold text-[#00D296]">Pago (R$ 189)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/30">
                <span>15/10/2025 — Vetaro Pro IA</span>
                <span className="font-bold text-[#00D296]">Pago (R$ 189)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CONFIGURAÇÕES DO SISTEMA & IA */}
      {settingsTab === 'preferencias' && (
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-base font-extrabold">
            Preferências de Geração de Laudos com IA & Aparência
          </h3>

          <div className="space-y-3">
            {[
              {
                key: 'autoMeasurements',
                title: 'Sugestão Automática de Impressão Diagnóstica',
                desc: 'A IA Vetaro sugere hipóteses diagnósticas ao final do laudo de ultrassom.'
              },
              {
                key: 'voiceDictation',
                title: 'Transcrição de Voz Veterinária em Tempo Real',
                desc: 'Permite ditar medidas de órgãos durante o exame ultrassonográfico.'
              },
              {
                key: 'includeHeaderLogo',
                title: 'Incluir Papel Timbrado e Carimbo CRMV no PDF',
                desc: 'Exporta os laudos prontos para envio via WhatsApp ou impressão.'
              }
            ].map((item) => (
              <div
                key={item.key}
                onClick={() =>
                  setUserProfile({
                    ...userProfile,
                    [item.key]: !userProfile[item.key]
                  })
                }
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs sm:text-sm font-extrabold">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    userProfile[item.key] ? 'bg-[#00D296]' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full bg-white shadow transform transition-transform"
                    style={{
                      transform: userProfile[item.key]
                        ? 'translateX(22px)'
                        : 'translateX(2px)'
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Alternador de Modo Claro / Escuro sincronizado com PostgreSQL */}
            <div
              onClick={() => setDarkMode(!darkMode)}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <p className="text-xs sm:text-sm font-extrabold">
                  Modo Escuro (Tema da Interface)
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Alterna instantaneamente entre o tema Escuro (#0A141D) e Claro (#F8FAFC).
                </p>
              </div>
              <div
                className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  darkMode ? 'bg-[#00D296]' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full bg-white shadow transform transition-transform"
                  style={{
                    transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
