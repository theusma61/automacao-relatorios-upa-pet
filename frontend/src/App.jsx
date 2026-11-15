import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  User,
  CreditCard,
  Sun,
  Moon,
  Copy,
  Check,
  Sliders,
  Palette,
  Smartphone,
  Tablet,
  Monitor,
  ZoomIn,
  ZoomOut,
  MoreHorizontal,
  Layout
} from 'lucide-react';
import {
  VetaroLogo,
  UltrasoundIcon,
  CardWaveBackground,
  BRAND_COLORS
} from './components/icons/VetaroIcons';
import { useTheme } from './context/ThemeContext';
import { useAuth, DEMO_USER_PROFILE } from './context/AuthContext';
import { api } from './services/api';
import Sidebar from './components/layout/Sidebar';
import MobileTabBar from './components/layout/MobileTabBar';
import TopHeader from './components/layout/TopHeader';
import ProfileDropdown from './components/layout/ProfileDropdown';
import Toast from './components/layout/Toast';
import ReportPreviewModal from './components/modals/ReportPreviewModal';
import AdminUsersModal from './components/modals/AdminUsersModal';
import LoginPage from './pages/LoginPage';
import DashboardHome from './pages/DashboardHome';
import UltrasoundGenerator from './pages/UltrasoundGenerator';
import SurgeryGenerator from './pages/SurgeryGenerator';
import SettingsPage from './pages/SettingsPage';

const INITIAL_ACTIVITIES = [
  {
    id: 'laudo-01',
    type: 'ultrassom',
    title: 'Laudo de Ultrassom',
    patient: 'Thor (Golden Retriever, 6 anos)',
    tutor: 'Carlos Eduardo Silva',
    date: 'Gerado em 14/11/2025 às 16:32',
    status: 'Concluído',
    summary:
      'Ultrassonografia abdominal total (Mindray Vetus 7). Fígado com dimensões preservadas, parênquima homogêneo e ecogenicidade normal. Vesícula biliar moderadamente repleta (parede 0,11 cm), sem lama biliar. Baço e rins sem alterações topográficas ou morfológicas. Impressão diagnóstica: Exame dentro dos padrões de normalidade para a espécie.'
  },
  {
    id: 'rel-02',
    type: 'relatorio',
    title: 'Relatório Cirúrgico Oficial',
    patient: 'Luna (Felino SRD, 3 anos)',
    tutor: 'Beatriz Mendes',
    date: 'Gerado em 13/11/2025 às 11:20',
    status: 'Concluído',
    summary:
      'Relatório Cirúrgico Oficial — Ovariohisterectomia Eletiva + Exérese de Nódulo Cutâneo. Anestesia inalatória com Isofluorano estável. Celiotomia retro-umbilical, ligadura tripla dos pedículos ovarianos e corpo uterino com Poliglactina 910 (3-0). Síntese em três planos. Anexo fotográfico da peça cirúrgica na Página 2.'
  },
  {
    id: 'laudo-03',
    type: 'ultrassom',
    title: 'Laudo de Ultrassom',
    patient: 'Max (Bulldog Francês, 4 anos)',
    tutor: 'Fernanda Costa',
    date: 'Gerado em 12/11/2025 às 09:17',
    status: 'Concluído',
    summary:
      'Avaliação vesical e renal. Bexiga urinária com repleção adequada, parede discretamente espessada (0,38 cm) em região crânio-ventral e presença de moderada quantidade de sedimento ecogênico em suspensão. Impressão diagnóstica: Achados compatíveis com cistite + sedimento urinário.'
  }
];

function formatDatePtBr(dateInput) {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return `Gerado em ${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(
      2,
      '0'
    )}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (_) {
    return String(dateInput);
  }
}

export default function App() {
  const { darkMode, setDarkMode } = useTheme();
  const {
    usuario,
    ssoConfig,
    loginComGoogleCredential,
    entrarModoDemonstracao,
    atualizarUsuarioLocal,
    logout
  } = useAuth();

  // Modo de visualização: 'auto' (App Responsivo Real) | 'prancha' | 'desktop' | 'tablet' | 'mobile' | 'specs'
  const [deviceView, setDeviceView] = useState('auto');
  const [showStudioBar, setShowStudioBar] = useState(true);
  const [activeNav, setActiveNav] = useState('inicio');
  const [settingsTab, setSettingsTab] = useState('perfil');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [fitToPhone, setFitToPhone] = useState(true);
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userProfile = usuario || DEMO_USER_PROFILE;

  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [copiedHex, setCopiedHex] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [layoutConfig, setLayoutConfig] = useState({
    headerStyle: 'Logotipo + CRMV Centralizado',
    gridColumns: '2 colunas (6 fotos por página)',
    autoCalipers: true
  });

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const carregarHistoricoServidor = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getHistorico();
      const exames = Array.isArray(res.exames) ? res.exames : [];
      const cirurgias = Array.isArray(res.cirurgias) ? res.cirurgias : [];

      const mappedExames = exames.map((ex) => ({
        id: `ex-${ex.id}`,
        type: 'ultrassom',
        title: 'Laudo de Ultrassom',
        patient: `${ex.pacienteNome || 'Paciente'} (${ex.pacienteEspecie || 'Canina'})`,
        tutor: ex.tutorNome || '',
        date: ex.criadoEm ? formatDatePtBr(ex.criadoEm) : `Gerado em ${ex.dataExame || ''}`,
        timestamp: ex.criadoEm ? new Date(ex.criadoEm).getTime() : 0,
        status: 'Concluído',
        pdfUrl: ex.pdfArquivo || '',
        docxUrl: ex.docxArquivo || '',
        summary: Array.isArray(ex.laudoEstruturado)
          ? ex.laudoEstruturado.map((item) => `• ${item.orgao || ''}: ${item.achados || ''}`).join('\n')
          : `Laudo de Ultrassonografia Abdominal — Paciente ${ex.pacienteNome} (${ex.imagensQtd || 0} imagens).`
      }));

      const mappedCirurgias = cirurgias.map((c) => ({
        id: `cir-${c.id}`,
        type: 'relatorio',
        title: `Relatório Cirúrgico — ${c.procedimento || 'Oficial'}`,
        patient: `${c.pacienteNome || 'Paciente'}${
          c.pacienteEspecie ? ` (${c.pacienteEspecie})` : ''
        }`,
        tutor: '',
        date: formatDatePtBr(c.criadoEm),
        timestamp: c.criadoEm ? new Date(c.criadoEm).getTime() : 0,
        status: 'Concluído',
        pdfUrl: c.pdfArquivo || '',
        docxUrl: c.docxArquivo || '',
        summary:
          c.dadosCirurgia?.descricaoProcedimento ||
          `Procedimento: ${c.procedimento || 'Cirurgia'}\nDiagnóstico: ${
            c.diagnostico || 'Padrão'
          }`
      }));

      const combined = [...mappedExames, ...mappedCirurgias].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      if (combined.length > 0) {
        setActivities([...combined, ...INITIAL_ACTIVITIES]);
      }
    } catch (_) {
      // Mantém INITIAL_ACTIVITIES se não autenticado ou banco vazio
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    carregarHistoricoServidor();
  }, [carregarHistoricoServidor, usuario]);

  const handleCopyHex = (hex) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex);
    }
    setCopiedHex(hex);
    showToast(`Código ${hex} copiado!`);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const openFromProfileMenu = (tab, targetDevice = null) => {
    setActiveNav('configuracoes');
    setSettingsTab(tab);
    setProfileMenuOpen(false);
    if (targetDevice) {
      setDeviceView(targetDevice);
    } else if (deviceView === 'prancha' || deviceView === 'specs') {
      setDeviceView('auto');
    }
    const titles = {
      perfil: `Meu perfil (${userProfile.name})`,
      assinatura: 'Plano e assinatura (Vetaro Pro IA)',
      preferencias: 'Configurações do Sistema & IA'
    };
    showToast(`Tela aberta: ${titles[tab]}`);
  };

  const handleAddActivity = (newAct) => {
    setActivities((prev) => [newAct, ...prev]);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    showToast('Sessão encerrada com segurança.');
  };

  if (showLoginModal) {
    return (
      <>
        <LoginPage
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          ssoConfig={ssoConfig}
          onGoogleCredential={async (cred) => {
            await loginComGoogleCredential(cred);
            setShowLoginModal(false);
          }}
          onEnterDemo={() => {
            entrarModoDemonstracao();
            setShowLoginModal(false);
            showToast('Modo interativo Vetaro ativado!');
          }}
          onToast={showToast}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  const availableWidth = Math.max(screenWidth - 24, 300);
  const boardZoom = fitToPhone && screenWidth < 1200 ? Math.min(1, availableWidth / 1180) : 1;
  const desktopZoom = fitToPhone && screenWidth < 1160 ? Math.min(1, availableWidth / 1120) : 1;
  const tabletZoom = fitToPhone && screenWidth < 860 ? Math.min(1, availableWidth / 820) : 1;

  const isAutoMobile = screenWidth < 768;
  const isAutoTablet = screenWidth >= 768 && screenWidth < 1024;

  const renderMainScreenContent = (isTabletLayout = false, isMobileLayout = false) => {
    if (activeNav === 'inicio') {
      return (
        <DashboardHome
          darkMode={darkMode}
          isTabletLayout={isTabletLayout}
          isMobileLayout={isMobileLayout}
          activities={activities}
          loadingHistory={loadingHistory}
          onRefreshHistory={carregarHistoricoServidor}
          onNavigate={(dest) => setActiveNav(dest)}
          onSelectReport={(rep) => setSelectedReport(rep)}
        />
      );
    }

    if (activeNav === 'ultrassom') {
      return (
        <UltrasoundGenerator
          darkMode={darkMode}
          userProfile={userProfile}
          layoutConfig={layoutConfig}
          setLayoutConfig={setLayoutConfig}
          onOpenProfile={() => openFromProfileMenu('perfil')}
          onNavigateHome={() => setActiveNav('inicio')}
          onAddActivity={handleAddActivity}
          onToast={showToast}
        />
      );
    }

    if (activeNav === 'relatorio') {
      return (
        <SurgeryGenerator
          darkMode={darkMode}
          userProfile={userProfile}
          layoutConfig={layoutConfig}
          onOpenProfile={() => openFromProfileMenu('perfil')}
          onNavigateHome={() => setActiveNav('inicio')}
          onAddActivity={handleAddActivity}
          onToast={showToast}
        />
      );
    }

    return (
      <SettingsPage
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isMobileLayout={isMobileLayout}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        userProfile={userProfile}
        setUserProfile={atualizarUsuarioLocal}
        activitiesCount={activities.length}
        onOpenAdminModal={() => setAdminModalOpen(true)}
        onToast={showToast}
      />
    );
  };

  const renderMiniDesktopForBoard = (isDarkTheme) => (
    <div
      className={`rounded-2xl border overflow-hidden shadow-xl flex ${
        isDarkTheme
          ? 'bg-[#0A141D] border-slate-800 text-white'
          : 'bg-[#F8FAFC] border-slate-200 text-[#0A141D]'
      }`}
      style={{ width: '550px', height: '355px' }}
    >
      <div
        className={`w-36 shrink-0 border-r p-3.5 flex flex-col justify-between ${
          isDarkTheme ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
            <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
            <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
          </div>
          <div className="mb-4">
            <VetaroLogo size={20} dark={isDarkTheme} textSize="text-base" />
          </div>
          <div className="space-y-1 text-[11px] font-semibold">
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                setActiveNav('inicio');
                setDeviceView('desktop');
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer relative ${
                isDarkTheme
                  ? 'bg-[#0D3131] text-[#00D296]'
                  : 'bg-[#DDF7F0] text-[#0D5C56]'
              }`}
            >
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#00D296]" />
              <Home className="w-3.5 h-3.5" />
              <span>Início</span>
            </div>
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                setActiveNav('ultrassom');
                setDeviceView('desktop');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer opacity-75 hover:opacity-100"
            >
              <UltrasoundIcon className="w-3.5 h-3.5" />
              <span>Ultrassom</span>
            </div>
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                setActiveNav('relatorio');
                setDeviceView('desktop');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer opacity-75 hover:opacity-100"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório</span>
            </div>
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                openFromProfileMenu('preferencias', 'desktop');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer opacity-75 hover:opacity-100"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </div>
          </div>
        </div>
        <div>
          <div
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[9px] font-semibold ${
              isDarkTheme
                ? 'border-slate-800 bg-[#0F1C26] text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <span>? Ajuda e suporte</span>
            <span>↗</span>
          </div>
          <p className="text-[8px] text-slate-400 mt-1 px-1">v1.0.0</p>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-extrabold text-sm">Olá, {userProfile.greetingName}!</h3>
            <p className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              Tudo pronto para otimizar seu trabalho hoje?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            <span
              onClick={() => {
                setDarkMode(isDarkTheme);
                setProfileMenuOpen(true);
                setDeviceView('desktop');
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold cursor-pointer ${
                isDarkTheme ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
              }`}
            >
              {userProfile.initials}
            </span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 my-1.5">
          <div
            className={`relative rounded-xl p-3 overflow-hidden border ${
              isDarkTheme
                ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/20'
                : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
            }`}
          >
            <CardWaveBackground dark={isDarkTheme} />
            <div className="relative z-10">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                  isDarkTheme ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]'
                }`}
              >
                <UltrasoundIcon className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-xs">Ultrassom</p>
              <p className="text-[9px] opacity-80 my-1">
                Envie suas imagens e receba um laudo completo com IA.
              </p>
              <span
                onClick={() => {
                  setDarkMode(isDarkTheme);
                  setActiveNav('ultrassom');
                  setDeviceView('desktop');
                }}
                className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer ${
                  isDarkTheme ? 'bg-[#00D296] text-[#062E2B]' : 'bg-[#0D5C56] text-white'
                }`}
              >
                Começar agora →
              </span>
            </div>
          </div>

          <div
            className={`relative rounded-xl p-3 overflow-hidden border ${
              isDarkTheme
                ? 'bg-gradient-to-br from-[#13232F] to-[#0F2C30] border-teal-500/20'
                : 'bg-gradient-to-br from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
            }`}
          >
            <CardWaveBackground dark={isDarkTheme} />
            <div className="relative z-10">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                  isDarkTheme ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-xs">Relatório</p>
              <p className="text-[9px] opacity-80 my-1">
                Envie seu documento e gere um relatório personalizado.
              </p>
              <span
                onClick={() => {
                  setDarkMode(isDarkTheme);
                  setActiveNav('relatorio');
                  setDeviceView('desktop');
                }}
                className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer ${
                  isDarkTheme ? 'bg-[#00D296] text-[#062E2B]' : 'bg-[#0D5C56] text-white'
                }`}
              >
                Começar agora →
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-[10px]">Atividade recente</span>
            <span
              className={`text-[9px] font-bold ${
                isDarkTheme ? 'text-[#00D296]' : 'text-[#0D5C56]'
              }`}
            >
              Ver todos →
            </span>
          </div>
          <div
            className={`rounded-lg border divide-y text-[9px] ${
              isDarkTheme
                ? 'bg-[#0E1A24] border-slate-800 divide-slate-800'
                : 'bg-white border-slate-200 divide-slate-100'
            }`}
          >
            {activities.slice(0, 3).map((act) => (
              <div key={act.id} className="px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 truncate">
                  <FileText className="w-3 h-3 opacity-70 shrink-0" />
                  <span className="truncate">{act.title}</span>
                </span>
                <span className="text-slate-400 shrink-0">{act.date}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[8px] font-bold shrink-0 ${
                    isDarkTheme
                      ? 'bg-[#0D4A3E] text-[#2CE5B1]'
                      : 'bg-[#D3F7E9] text-[#0D684E]'
                  }`}
                >
                  {act.status}
                </span>
                <MoreHorizontal className="w-3 h-3 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{ fontFamily: "'Manrope', sans-serif" }}
      onClick={() => profileMenuOpen && setProfileMenuOpen(false)}
      className={`min-h-screen transition-colors duration-300 flex flex-col ${
        darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F1F6F8] text-[#0A141D]'
      }`}
    >
      {/* Barra Superior de Inspecão Multi-Dispositivo / Design System (Pode ser recolhida) */}
      {showStudioBar ? (
        <div
          className={`w-full border-b px-3 sm:px-6 py-2.5 flex flex-col gap-2 z-40 sticky top-0 backdrop-blur-md ${
            darkMode
              ? 'bg-[#070E14]/95 border-slate-800 text-slate-200'
              : 'bg-white/95 border-slate-200 text-[#0A141D]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <VetaroLogo size={24} dark={darkMode} textSize="text-base" />
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00D296]/15 text-[#00D296]">
                Vetaro SaaS • React + PostgreSQL
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!usuario || usuario.isDemo ? (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border border-[#00D296]/40 text-[#00D296] hover:bg-[#00D296]/10"
                >
                  Login Google SSO
                </button>
              ) : null}

              {screenWidth < 1160 &&
                deviceView !== 'auto' &&
                deviceView !== 'mobile' &&
                deviceView !== 'specs' && (
                  <button
                    type="button"
                    onClick={() => setFitToPhone(!fitToPhone)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1 shadow-xs"
                  >
                    {fitToPhone ? (
                      <>
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Ver Tamanho 100%</span>
                      </>
                    ) : (
                      <>
                        <ZoomOut className="w-3.5 h-3.5" />
                        <span>Encaixar na Tela</span>
                      </>
                    )}
                  </button>
                )}

              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-[#00D296]'
                    : 'border-slate-300 bg-slate-100 text-[#0D5C56]'
                }`}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Claro' : 'Escuro'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeviceView('auto');
                  setShowStudioBar(false);
                }}
                title="Ocultar barra de dispositivos e usar em tela cheia"
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white"
              >
                Tela Cheia ✕
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { id: 'auto', label: '⚡ App Responsivo (Produção)', icon: Layout },
              { id: 'prancha', label: '1. Prancha Completa (Foto 1 + 2)', icon: Palette },
              { id: 'desktop', label: '2. Computador (Desktop)', icon: Monitor },
              { id: 'tablet', label: '3. Tablet (iPad)', icon: Tablet },
              { id: 'mobile', label: '4. Celular (App)', icon: Smartphone },
              { id: 'specs', label: '5. Guia & Medidas (Dev)', icon: Sliders }
            ].map((item) => {
              const Icon = item.icon;
              const active = deviceView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDeviceView(item.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                      : darkMode
                      ? 'bg-[#111F2B] text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 no-scrollbar">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Telas:
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveNav('inicio');
                if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('auto');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                activeNav === 'inicio' && deviceView !== 'prancha'
                  ? 'bg-[#0D5C56] text-white'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              Início (Dashboard)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('ultrassom');
                if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('auto');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                activeNav === 'ultrassom' && deviceView !== 'prancha'
                  ? 'bg-[#00D296] text-[#062E2B]'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              ✨ Ultrassom (Mindray IA)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('relatorio');
                if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('auto');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                activeNav === 'relatorio' && deviceView !== 'prancha'
                  ? 'bg-[#00D296] text-[#062E2B]'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              ✨ Relatório Cirúrgico IA
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('auto');
                setProfileMenuOpen(!profileMenuOpen);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 border ${
                profileMenuOpen
                  ? 'bg-[#00D296] text-[#062E2B] border-[#00D296]'
                  : 'border-[#00D296]/40 text-[#00D296]'
              }`}
            >
              Menu Perfil {userProfile.initials} ▾
            </button>
            <button
              type="button"
              onClick={() => openFromProfileMenu('perfil')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                activeNav === 'configuracoes' && settingsTab === 'perfil'
                  ? 'bg-[#0D5C56] text-white'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              Meu Perfil
            </button>
            <button
              type="button"
              onClick={() => openFromProfileMenu('assinatura')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                activeNav === 'configuracoes' && settingsTab === 'assinatura'
                  ? 'bg-[#0D5C56] text-white'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              Plano e Assinatura
            </button>
            <button
              type="button"
              onClick={() => openFromProfileMenu('preferencias')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                activeNav === 'configuracoes' && settingsTab === 'preferencias'
                  ? 'bg-[#0D5C56] text-white'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              Configurações IA
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowStudioBar(true)}
          className="fixed bottom-4 left-4 z-40 px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-[#0D5C56] text-white border border-[#00D296]/40 shadow-lg flex items-center gap-1.5 opacity-80 hover:opacity-100 transition"
        >
          <Palette className="w-3.5 h-3.5 text-[#00D296]" />
          <span>Design System / Telas</span>
        </button>
      )}

      {/* =========================================================
          MODO AUTO: APLICATIVO RESPONSIVO NATIVO DE PRODUÇÃO
         ========================================================= */}
      {deviceView === 'auto' && (
        <div
          className={`flex-1 flex ${
            isAutoMobile ? 'flex-col justify-between' : 'flex-row'
          } min-h-0`}
        >
          {!isAutoMobile && (
            <Sidebar
              darkMode={darkMode}
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              compact={isAutoTablet}
              showWindowDots={false}
              onHelpClick={() =>
                showToast('Suporte Técnico Veterinário Vetaro disponível!')
              }
            />
          )}

          <main
            className={`flex-1 ${
              isAutoMobile ? 'p-4 pb-20' : isAutoTablet ? 'p-6' : 'p-8 max-w-6xl'
            } flex flex-col relative overflow-y-auto`}
          >
            {isAutoMobile ? (
              <>
                <div className="flex items-center justify-between mb-5 relative">
                  <VetaroLogo size={26} dark={darkMode} textSize="text-xl" />
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => showToast('Nenhuma notificação pendente.')}
                      className="p-1.5 rounded-full relative"
                    >
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00D296]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileMenuOpen(!profileMenuOpen);
                      }}
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
                        darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
                      }`}
                    >
                      {userProfile.initials}
                    </button>
                  </div>
                  {profileMenuOpen && (
                    <ProfileDropdown
                      isStandalone={false}
                      darkMode={darkMode}
                      setDarkMode={setDarkMode}
                      userProfile={userProfile}
                      activeNav={activeNav}
                      settingsTab={settingsTab}
                      onSelectTab={openFromProfileMenu}
                      onOpenAdminModal={() => {
                        setProfileMenuOpen(false);
                        setAdminModalOpen(true);
                      }}
                      onLogout={handleLogout}
                    />
                  )}
                </div>

                <div className="mb-5">
                  <h2 className="text-2xl font-extrabold">
                    Olá, {userProfile.greetingName}!
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tudo pronto para otimizar seu trabalho hoje?
                  </p>
                </div>

                {renderMainScreenContent(false, true)}
              </>
            ) : (
              <>
                <TopHeader
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                  userProfile={userProfile}
                  activeNav={activeNav}
                  settingsTab={settingsTab}
                  profileMenuOpen={profileMenuOpen}
                  setProfileMenuOpen={setProfileMenuOpen}
                  onSelectTab={openFromProfileMenu}
                  onOpenAdminModal={() => {
                    setProfileMenuOpen(false);
                    setAdminModalOpen(true);
                  }}
                  onLogout={handleLogout}
                  onBellClick={() => showToast('Nenhuma notificação pendente.')}
                  compact={isAutoTablet}
                />
                {renderMainScreenContent(isAutoTablet, false)}
              </>
            )}
          </main>

          {isAutoMobile && (
            <div className="fixed bottom-0 left-0 right-0 z-30">
              <MobileTabBar
                darkMode={darkMode}
                activeNav={activeNav}
                setActiveNav={setActiveNav}
              />
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          MODO 1: PRANCHA COMPLETA (FOTO 1 + FOTO 2)
         ========================================================= */}
      {deviceView === 'prancha' && (
        <div className="flex-1 p-3 sm:p-6 overflow-x-auto">
          <div className="w-full overflow-x-auto pb-4 flex justify-center">
            <div
              className="rounded-3xl p-6 bg-[#EBF2F7] text-[#0A141D] shadow-2xl border border-slate-300 shrink-0"
              style={{
                width: '1150px',
                zoom: boardZoom
              }}
            >
              <div className="grid grid-cols-2 gap-6 mb-6">
                {renderMiniDesktopForBoard(false)}
                {renderMiniDesktopForBoard(true)}
              </div>

              <div className="grid grid-cols-12 gap-5 items-stretch">
                {/* Tablet iPad Mockup */}
                <div className="col-span-5 rounded-[26px] border-[10px] border-[#151D26] bg-[#F8FAFC] text-[#0A141D] shadow-xl flex overflow-hidden">
                  <div className="w-32 bg-white border-r border-slate-200 p-3 flex flex-col justify-between shrink-0">
                    <div>
                      <div className="mb-4">
                        <VetaroLogo size={18} dark={false} textSize="text-sm" />
                      </div>
                      <div className="space-y-1 text-[10px] font-semibold">
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#DDF7F0] text-[#0D5C56] relative">
                          <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#00D296]" />
                          <Home className="w-3 h-3" /> Início
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600">
                          <UltrasoundIcon className="w-3 h-3" /> Ultrassom
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600">
                          <FileText className="w-3 h-3" /> Relatório
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600">
                          <Settings className="w-3 h-3" /> Configurações
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="px-2 py-1 rounded border border-slate-200 text-[8px] font-semibold flex items-center justify-between">
                        <span>? Ajuda e suporte</span>
                        <span>↗</span>
                      </div>
                      <p className="text-[8px] text-slate-400 mt-1">v1.0.0</p>
                    </div>
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-extrabold text-sm">
                          Olá, {userProfile.greetingName}!
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Tudo pronto para otimizar seu trabalho hoje?
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        <span className="w-6 h-6 rounded-full bg-[#1E2D3D] text-white text-[9px] font-bold flex items-center justify-center">
                          {userProfile.initials}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>

                    <div
                      onClick={() => setDeviceView('tablet')}
                      className="relative rounded-xl p-3 bg-gradient-to-r from-[#E4F8F2] to-[#D5F4EC] border border-[#C5EFE3] flex items-center gap-3 overflow-hidden my-1 cursor-pointer"
                    >
                      <CardWaveBackground dark={false} />
                      <div className="w-11 h-11 rounded-xl bg-[#C4F1E3] text-[#00A878] flex items-center justify-center shrink-0 relative z-10">
                        <UltrasoundIcon className="w-6 h-6" />
                      </div>
                      <div className="relative z-10">
                        <p className="font-extrabold text-xs">Ultrassom</p>
                        <p className="text-[9px] text-slate-600 mb-1.5">
                          Envie suas imagens e receba um laudo completo com IA.
                        </p>
                        <span className="px-3 py-1 rounded-full bg-[#0D5C56] text-white text-[9px] font-bold inline-block">
                          Começar agora →
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setDeviceView('tablet')}
                      className="relative rounded-xl p-3 bg-gradient-to-r from-[#EAF6F6] to-[#DDF1F0] border border-[#D0EAE8] flex items-center gap-3 overflow-hidden my-1 cursor-pointer"
                    >
                      <CardWaveBackground dark={false} />
                      <div className="w-11 h-11 rounded-xl bg-[#CBEFE4] text-[#0D5C56] flex items-center justify-center shrink-0 relative z-10">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="relative z-10">
                        <p className="font-extrabold text-xs">Relatório</p>
                        <p className="text-[9px] text-slate-600 mb-1.5">
                          Envie seu documento e gere um relatório personalizado.
                        </p>
                        <span className="px-3 py-1 rounded-full bg-[#0D5C56] text-white text-[9px] font-bold inline-block">
                          Começar agora →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2 Celulares (Light & Dark) */}
                <div className="col-span-4 grid grid-cols-2 gap-3">
                  {[false, true].map((isDarkPhone, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDarkMode(isDarkPhone);
                        setDeviceView('mobile');
                      }}
                      className={`rounded-[28px] border-[6px] border-[#1A242F] p-3 flex flex-col justify-between shadow-lg cursor-pointer ${
                        isDarkPhone
                          ? 'bg-[#0A141D] text-white'
                          : 'bg-[#F8FAFC] text-[#0A141D]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[8px] font-bold mb-2">
                          <span>9:41</span>
                          <span className="w-8 h-2 rounded-full bg-black" />
                          <span>5G</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <VetaroLogo size={16} dark={isDarkPhone} textSize="text-xs" />
                          <Bell className="w-3 h-3" />
                        </div>
                        <p className="font-extrabold text-xs">
                          Olá, {userProfile.greetingName}!
                        </p>
                        <p className="text-[8px] opacity-70 mb-2">
                          Tudo pronto para otimizar seu trabalho hoje?
                        </p>

                        <div className="space-y-2">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              isDarkPhone
                                ? 'bg-[#132530] border-teal-500/20'
                                : 'bg-[#E4F8F2] border-[#C5EFE3]'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 ${
                                isDarkPhone
                                  ? 'bg-[#0E3A38] text-[#00D296]'
                                  : 'bg-[#C4F1E3] text-[#00A878]'
                              }`}
                            >
                              <UltrasoundIcon className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-extrabold text-[10px]">Ultrassom</p>
                            <p className="text-[8px] opacity-80 mb-1.5">
                              Envie suas imagens e receba um laudo completo com IA.
                            </p>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold inline-block ${
                                isDarkPhone
                                  ? 'bg-[#00D296] text-[#062E2B]'
                                  : 'bg-[#0D5C56] text-white'
                              }`}
                            >
                              Começar agora →
                            </span>
                          </div>

                          <div
                            className={`p-2.5 rounded-xl border ${
                              isDarkPhone
                                ? 'bg-[#13232F] border-teal-500/20'
                                : 'bg-[#EAF6F6] border-[#D0EAE8]'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 ${
                                isDarkPhone
                                  ? 'bg-[#0E3A38] text-[#00D296]'
                                  : 'bg-[#CBEFE4] text-[#0D5C56]'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-extrabold text-[10px]">Relatório</p>
                            <p className="text-[8px] opacity-80 mb-1.5">
                              Envie seu documento e gere um relatório personalizado.
                            </p>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold inline-block ${
                                isDarkPhone
                                  ? 'bg-[#00D296] text-[#062E2B]'
                                  : 'bg-[#0D5C56] text-white'
                              }`}
                            >
                              Começar agora →
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t flex justify-around text-[7px] font-bold text-slate-400 ${
                          isDarkPhone ? 'border-slate-800' : 'border-slate-200'
                        }`}
                      >
                        <span className="text-[#00D296] flex flex-col items-center">
                          <Home className="w-3 h-3" /> Início
                        </span>
                        <span className="flex flex-col items-center">
                          <FileText className="w-3 h-3" /> Histórico
                        </span>
                        <span className="flex flex-col items-center">
                          <Settings className="w-3 h-3" /> Configurações
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coluna Direita: Identidade Visual Vetaro */}
                <div className="col-span-3 flex flex-col justify-between p-2">
                  <div className="py-1">
                    <VetaroLogo size={44} dark={false} textSize="text-4xl" />
                  </div>

                  <div className="flex items-center gap-2.5 my-2">
                    {BRAND_COLORS.map((c) => (
                      <div
                        key={c.hex}
                        onClick={() => handleCopyHex(c.hex)}
                        title={`Copiar ${c.hex}`}
                        className="w-10 h-10 rounded-xl shadow-sm border border-slate-300 cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>

                  <div className="py-2 border-y border-slate-300">
                    <p className="font-bold text-sm text-[#0A141D]">Manrope</p>
                    <p className="text-xs font-medium text-[#637692] mt-0.5">
                      Aa Bb Cc 0123456789
                    </p>
                  </div>

                  <div className="flex items-center justify-between px-1 py-2 text-[#0A141D]">
                    <Home className="w-5 h-5" />
                    <UltrasoundIcon className="w-5 h-5" />
                    <FileText className="w-5 h-5" />
                    <Settings className="w-5 h-5" />
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="px-4 py-3 rounded-2xl bg-[#E1ECEE] flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0A141D]">
                      Tecnologia que cuida.
                    </span>
                    <span className="w-8 h-0.5 bg-[#00D296] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção da 2ª Foto: Menu do Perfil + Cartões */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-4 flex flex-col items-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#00D296] mb-2">
                Menu da 2ª Foto (Toque nos itens para abrir!)
              </span>
              <ProfileDropdown
                isStandalone={true}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                userProfile={userProfile}
                activeNav={activeNav}
                settingsTab={settingsTab}
                onSelectTab={openFromProfileMenu}
                onOpenAdminModal={() => setAdminModalOpen(true)}
                onLogout={handleLogout}
              />
            </div>

            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-base sm:text-xl font-extrabold">
                Telas geradas ao clicar no menu de perfil (Computador, Tablet e Celular):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => openFromProfileMenu('perfil', 'desktop')}
                  className={`p-4 rounded-2xl border text-left transition hover:border-[#00D296] ${
                    darkMode ? 'bg-[#101E29] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <User className="w-6 h-6 text-[#00D296] mb-2" />
                  <p className="font-extrabold text-sm">1. Meu Perfil</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Edição do CRMV, clínica, logotipo e assinatura digital nos laudos.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => openFromProfileMenu('assinatura', 'desktop')}
                  className={`p-4 rounded-2xl border text-left transition hover:border-[#00D296] ${
                    darkMode ? 'bg-[#101E29] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-[#00D296] mb-2" />
                  <p className="font-extrabold text-sm">2. Plano e Assinatura</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Detalhes do plano Vetaro Pro IA ilimitado, métricas de uso mensal e faturas.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => openFromProfileMenu('preferencias', 'desktop')}
                  className={`p-4 rounded-2xl border text-left transition hover:border-[#00D296] ${
                    darkMode ? 'bg-[#101E29] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <Settings className="w-6 h-6 text-[#00D296] mb-2" />
                  <p className="font-extrabold text-sm">3. Configurações & IA</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Preferências de conclusão automática, transcrição de voz e Modo Claro.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 2: TELA DE COMPUTADOR (DESKTOP 1120px)
         ========================================================= */}
      {deviceView === 'desktop' && (
        <div className="flex-1 p-2 sm:p-6 overflow-x-auto flex justify-center">
          <div
            className={`rounded-3xl border shadow-2xl flex overflow-hidden shrink-0 transition-colors ${
              darkMode
                ? 'bg-[#0A141D] border-slate-800 text-white'
                : 'bg-[#F8FAFC] border-slate-200 text-[#0A141D]'
            }`}
            style={{
              width: '1120px',
              minHeight: '680px',
              zoom: desktopZoom
            }}
          >
            <Sidebar
              darkMode={darkMode}
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              compact={false}
              showWindowDots={true}
              onHelpClick={() =>
                showToast('Suporte Técnico Veterinário Vetaro disponível!')
              }
            />

            <main className="flex-1 p-8 flex flex-col relative">
              <TopHeader
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                userProfile={userProfile}
                activeNav={activeNav}
                settingsTab={settingsTab}
                profileMenuOpen={profileMenuOpen}
                setProfileMenuOpen={setProfileMenuOpen}
                onSelectTab={openFromProfileMenu}
                onOpenAdminModal={() => {
                  setProfileMenuOpen(false);
                  setAdminModalOpen(true);
                }}
                onLogout={handleLogout}
                onBellClick={() => showToast('Nenhuma notificação pendente.')}
                compact={false}
              />

              {renderMainScreenContent(false, false)}
            </main>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 3: TELA DE TABLET (iPad 820px)
         ========================================================= */}
      {deviceView === 'tablet' && (
        <div className="flex-1 p-2 sm:p-6 overflow-x-auto flex justify-center">
          <div
            className={`rounded-[34px] border-[12px] border-[#161F29] shadow-2xl flex overflow-hidden shrink-0 ${
              darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'
            }`}
            style={{
              width: '820px',
              minHeight: '580px',
              zoom: tabletZoom
            }}
          >
            <Sidebar
              darkMode={darkMode}
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              compact={true}
              showWindowDots={false}
              onHelpClick={() =>
                showToast('Suporte Técnico Veterinário Vetaro disponível!')
              }
            />

            <main className="flex-1 p-7 flex flex-col relative">
              <TopHeader
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                userProfile={userProfile}
                activeNav={activeNav}
                settingsTab={settingsTab}
                profileMenuOpen={profileMenuOpen}
                setProfileMenuOpen={setProfileMenuOpen}
                onSelectTab={openFromProfileMenu}
                onOpenAdminModal={() => {
                  setProfileMenuOpen(false);
                  setAdminModalOpen(true);
                }}
                onLogout={handleLogout}
                onBellClick={() => showToast('Nenhuma notificação pendente.')}
                compact={true}
              />

              {renderMainScreenContent(true, false)}
            </main>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 4: TELA DE CELULAR (APP NATIVO 400px)
         ========================================================= */}
      {deviceView === 'mobile' && (
        <div className="flex-1 p-3 flex justify-center">
          <div
            className={`w-full max-w-[400px] rounded-[38px] border-[8px] border-[#1A242F] shadow-2xl flex flex-col justify-between overflow-hidden ${
              darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'
            }`}
          >
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-bold mb-4 px-1">
                <span>9:41</span>
                <span className="w-20 h-4 rounded-full bg-black" />
                <span>5G 100%</span>
              </div>

              <div className="flex items-center justify-between mb-5 relative">
                <VetaroLogo size={26} dark={darkMode} textSize="text-xl" />
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileMenuOpen(!profileMenuOpen);
                    }}
                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
                      darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
                    }`}
                  >
                    {userProfile.initials}
                  </button>
                </div>
                {profileMenuOpen && (
                  <ProfileDropdown
                    isStandalone={false}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    userProfile={userProfile}
                    activeNav={activeNav}
                    settingsTab={settingsTab}
                    onSelectTab={openFromProfileMenu}
                    onOpenAdminModal={() => {
                      setProfileMenuOpen(false);
                      setAdminModalOpen(true);
                    }}
                    onLogout={handleLogout}
                  />
                )}
              </div>

              <div className="mb-5">
                <h2 className="text-2xl font-extrabold">
                  Olá, {userProfile.greetingName}!
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tudo pronto para otimizar seu trabalho hoje?
                </p>
              </div>

              {renderMainScreenContent(false, true)}
            </div>

            <MobileTabBar
              darkMode={darkMode}
              activeNav={activeNav}
              setActiveNav={setActiveNav}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 5: GUIA DE IDENTIDADE VISUAL & ESPECIFICAÇÕES
         ========================================================= */}
      {deviceView === 'specs' && (
        <div className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#00D296]">
              Design System Oficial • vetaro
            </span>
            <h2 className="text-2xl font-extrabold mt-1">
              Cores, Tipografia e Regras para Computador, Tablet e Celular
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {BRAND_COLORS.map((color) => (
              <div
                key={color.hex}
                onClick={() => handleCopyHex(color.hex)}
                className={`p-4 rounded-2xl border cursor-pointer transition hover:scale-[1.02] ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className="w-full h-16 rounded-xl mb-3 border border-black/10"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">{color.hex}</span>
                  {copiedHex === color.hex ? (
                    <Check className="w-4 h-4 text-[#00D296]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <p className="text-xs font-bold mt-1">{color.name}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {color.usage}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#00D296] font-extrabold text-sm">
                <Monitor className="w-4 h-4" />
                <span>Tela de Computador (Desktop ≥ 1024px)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Sidebar Esquerda Fixa (256px):</strong> Logo Vetaro, 4 rotas
                principais com indicador vertical verde (4px) e card inferior{' '}
                <em>Ajuda e suporte ↗ v1.0.0</em>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Cards Lado a Lado (Grid 2 Colunas):</strong> Cards de Ultrassom e
                Relatório dividem 50%/50% da largura com ícone de 56x56px no topo.
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#00D296] font-extrabold text-sm">
                <Tablet className="w-4 h-4" />
                <span>Tela de Tablet / iPad (768px – 1023px)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Sidebar Mantida (208px):</strong> Mantém a coluna esquerda visível
                para navegação rápida com o toque.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Cards Horizontais Empilhados:</strong> Ícone grande (80x80px) à
                esquerda e título + descrição + botão à direita.
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#00D296] font-extrabold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Tela de Celular (&lt; 768px)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Tab Bar Inferior Fixa:</strong> Barra inferior com 3 abas:{' '}
                <em>Início</em>, <em>Histórico</em> e <em>Configurações</em>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Topo Compacto:</strong> Logo Vetaro à esquerda, sino e avatar à
                direita.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes de Relatório / Laudo */}
      <ReportPreviewModal
        report={selectedReport}
        darkMode={darkMode}
        onClose={() => setSelectedReport(null)}
        onToast={showToast}
      />

      {/* Modal Administrativo RBAC */}
      <AdminUsersModal
        darkMode={darkMode}
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onToast={showToast}
      />

      {/* Toast Flutuante */}
      <Toast message={toastMessage} />
    </div>
  );
}
