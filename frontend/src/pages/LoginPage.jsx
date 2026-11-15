import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Sparkles, Sun, Moon } from 'lucide-react';
import { VetaroLogo, CardWaveBackground } from '../components/icons/VetaroIcons';

export default function LoginPage({
  darkMode,
  setDarkMode,
  ssoConfig,
  onGoogleCredential,
  onEnterDemo,
  onToast
}) {
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!ssoConfig?.googleClientId) return;
    let timer = null;

    const renderBtn = () => {
      if (window.google && window.google.accounts && window.google.accounts.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: ssoConfig.googleClientId,
          callback: async (response) => {
            try {
              await onGoogleCredential(response.credential);
              onToast('Autenticado com sucesso via Google SSO!');
            } catch (err) {
              onToast('Erro no login Google: ' + err.message);
            }
          }
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: darkMode ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280
        });
      } else {
        timer = setTimeout(renderBtn, 400);
      }
    };

    renderBtn();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ssoConfig, darkMode, onGoogleCredential, onToast]);

  return (
    <div
      style={{ fontFamily: "'Manrope', sans-serif" }}
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors duration-300 ${
        darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'
      }`}
    >
      {/* Topo com Logo e Switch Claro/Escuro */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <VetaroLogo size={34} dark={darkMode} />
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition ${
            darkMode
              ? 'border-slate-800 bg-[#0F1C26] text-[#00D296]'
              : 'border-slate-200 bg-white text-[#0D5C56]'
          }`}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>
      </div>

      {/* Card Central de Autenticação */}
      <div className="my-auto max-w-md w-full mx-auto">
        <div
          className={`relative rounded-3xl border p-8 sm:p-10 shadow-2xl overflow-hidden text-center ${
            darkMode
              ? 'bg-[#0F1C26] border-[#1E3545] text-white'
              : 'bg-white border-slate-200 text-[#0A141D]'
          }`}
        >
          <CardWaveBackground dark={darkMode} />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
                darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#0D5C56]'
              }`}
            >
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">
              Acesso Clínico Vetaro
            </h1>
            <p
              className={`text-xs sm:text-sm mt-2 mb-6 leading-relaxed ${
                darkMode ? 'text-slate-300' : 'text-[#52657A]'
              }`}
            >
              Entre com sua conta Google autorizada para emitir laudos de ultrassom Mindray e
              relatórios cirúrgicos oficiais com seu timbre e CRMV.
            </p>

            {ssoConfig?.googleClientId ? (
              <div className="flex justify-center my-2" ref={googleBtnRef} />
            ) : (
              <div
                className={`w-full p-3.5 rounded-xl border text-xs text-left mb-4 ${
                  darkMode
                    ? 'bg-[#0A141D]/80 border-teal-500/30 text-slate-300'
                    : 'bg-[#F0FBF7] border-teal-600/30 text-slate-700'
                }`}
              >
                <p className="font-extrabold text-[#00D296] mb-1">
                  Google SSO (GOOGLE_CLIENT_ID)
                </p>
                <p className="leading-relaxed">
                  Configure <code>GOOGLE_CLIENT_ID</code> no arquivo <code>.env</code> para
                  ativar o botão oficial do Google Identity Services, ou acesse abaixo o modo
                  interativo.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onEnterDemo}
              className={`w-full mt-3 py-3.5 px-5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition ${
                darkMode
                  ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110'
                  : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Entrar no Painel Interativo Vetaro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-center text-xs text-slate-500">
        vetaro • Tecnologia que cuida • Multi-Tenant PostgreSQL
      </div>
    </div>
  );
}
