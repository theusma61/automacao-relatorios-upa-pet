import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ShieldAlert } from 'lucide-react';
import { VetaroLogo } from './components/icons/VetaroIcons';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import Sidebar from './components/layout/Sidebar';
import MobileTabBar from './components/layout/MobileTabBar';
import TopHeader from './components/layout/TopHeader';
import ProfileDropdown from './components/layout/ProfileDropdown';
import Toast from './components/layout/Toast';
import ReportPreviewModal from './components/modals/ReportPreviewModal';
import AdminUsersModal from './components/modals/AdminUsersModal';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardHome from './pages/DashboardHome';
import UltrasoundGenerator from './pages/UltrasoundGenerator';
import SurgeryGenerator from './pages/SurgeryGenerator';
import SettingsPage from './pages/SettingsPage';
import MeusPadroesPage from './pages/MeusPadroesPage';

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
    carregandoSessao,
    loginComGoogleCredential,
    atualizarUsuarioLocal,
    logout
  } = useAuth();

  const [showLanding, setShowLanding] = useState(true);
  const [activeNav, setActiveNav] = useState('inicio');
  const [settingsTab, setSettingsTab] = useState('perfil');
  const [padroesTab, setPadroesTab] = useState('ultrassom');
  const [newUiEnabled, setNewUiEnabled] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activities, setActivities] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
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
    if (!usuario) return;
    setLoadingHistory(true);
    try {
      const res = await api.getHistorico();
      const exames = Array.isArray(res.exames) ? res.exames : [];
      const cirurgias = Array.isArray(res.cirurgias) ? res.cirurgias : [];

      const mappedExames = exames.map((ex) => {
        const jobId = ex.pdfArquivo ? ex.pdfArquivo.split('/')[2] : '';
        return {
          id: `ex-${ex.id}`,
          jobId,
          type: 'ultrassom',
          title: 'Laudo de Ultrassom',
          patient: `${ex.pacienteNome || 'Paciente'} (${ex.pacienteEspecie || 'Canina'})`,
          tutor: ex.tutorNome || '',
          date: ex.criadoEm ? formatDatePtBr(ex.criadoEm) : `Gerado em ${ex.dataExame || ''}`,
          timestamp: ex.criadoEm ? new Date(ex.criadoEm).getTime() : 0,
          status: 'Concluído',
          pdfUrl: ex.pdfArquivo || '',
          docxUrl: ex.docxArquivo || '',
          paciente: {
            nome: ex.pacienteNome || '',
            especie: ex.pacienteEspecie || 'Canina',
            sexo: ex.pacienteSexo || 'Macho',
            idade: ex.pacienteIdade || '',
            tutor: ex.tutorNome || '',
            data: ex.dataExame || ''
          },
          laudo: ex.laudoEstruturado || [],
          laudoEstruturado: ex.laudoEstruturado || [],
          summary: Array.isArray(ex.laudoEstruturado)
            ? ex.laudoEstruturado
                .map((item) => `• ${item.orgao || ''}: ${item.texto || item.achados || ''}`)
                .join('\n')
            : `Laudo de Ultrassonografia Abdominal — Paciente ${ex.pacienteNome} (${
                ex.imagensQtd || 0
              } imagens).`
        };
      });

      const mappedCirurgias = cirurgias.map((c) => {
        const jobId = c.pdfArquivo ? c.pdfArquivo.split('/')[2] : '';
        return {
          id: `cir-${c.id}`,
          jobId,
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
          paciente: {
            nome: c.pacienteNome || '',
            especie: c.pacienteEspecie || 'Canina'
          },
          cirurgia: c.dadosCirurgia || {},
          summary:
            c.dadosCirurgia?.descricaoProcedimento ||
            `Procedimento: ${c.procedimento || 'Cirurgia'}\nDiagnóstico: ${
              c.diagnostico || 'Padrão'
            }`
        };
      });

      const combined = [...mappedExames, ...mappedCirurgias].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      setActivities(combined);
    } catch (_) {
      setActivities([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      carregarHistoricoServidor();
      try {
        const key = `vetaro_new_ui_v2_${usuario.id || usuario.email || 'default'}`;
        setNewUiEnabled(localStorage.getItem(key) === 'true');
      } catch (_) {}
    }
  }, [carregarHistoricoServidor, usuario]);

  const handleToggleNewUi = (ativo) => {
    setNewUiEnabled(ativo);
    try {
      const key = `vetaro_new_ui_v2_${usuario?.id || usuario?.email || 'default'}`;
      localStorage.setItem(key, ativo ? 'true' : 'false');
    } catch (_) {}
    if (ativo) {
      if (activeNav === 'configuracoes' && (settingsTab === 'estilo' || settingsTab === 'estilo_cirurgia')) {
        setPadroesTab(settingsTab === 'estilo_cirurgia' ? 'cirurgia' : 'ultrassom');
        setActiveNav('meus-padroes');
      }
      showToast('✨ Nova interface ativada para sua conta! O Hub "Meus Padrões" já está no menu.');
    } else {
      if (activeNav === 'meus-padroes') {
        setSettingsTab(padroesTab === 'cirurgia' ? 'estilo_cirurgia' : 'estilo');
        setActiveNav('configuracoes');
      }
      showToast('Interface clássica restaurada para sua conta.');
    }
  };

  const openMeusPadroes = (tab = 'ultrassom') => {
    setPadroesTab(tab);
    if (newUiEnabled) {
      setActiveNav('meus-padroes');
    } else {
      setSettingsTab(tab === 'cirurgia' ? 'estilo_cirurgia' : 'estilo');
      setActiveNav('configuracoes');
    }
    setProfileMenuOpen(false);
  };

  const openFromProfileMenu = (tab) => {
    if (newUiEnabled && (tab === 'estilo' || tab === 'estilo_cirurgia')) {
      setPadroesTab(tab === 'estilo_cirurgia' ? 'cirurgia' : 'ultrassom');
      setActiveNav('meus-padroes');
      setProfileMenuOpen(false);
      return;
    }
    setActiveNav('configuracoes');
    setSettingsTab(tab);
    setProfileMenuOpen(false);
  };

  const handleAddActivity = (newAct) => {
    setActivities((prev) => [newAct, ...prev]);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    showToast('Sessão encerrada com segurança.');
  };

  if (carregandoSessao) {
    return (
      <div
        style={{ fontFamily: "'Manrope', sans-serif" }}
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <VetaroLogo size={38} dark={darkMode} />
          <p className="text-xs font-bold text-slate-400 animate-pulse">
            Verificando sessão...
          </p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    if (showLanding) {
      return (
        <>
          <LandingPage
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onStartFree={() => setShowLanding(false)}
            onLogin={() => setShowLanding(false)}
            onOpenSupport={() =>
              showToast('Suporte Vetaro: contato@vetaro.com.br ou WhatsApp Oficial')
            }
          />
          <Toast message={toastMessage} />
        </>
      );
    }

    return (
      <>
        <LoginPage
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          ssoConfig={ssoConfig}
          onGoogleCredential={loginComGoogleCredential}
          onBackToLanding={() => setShowLanding(true)}
          onToast={showToast}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const podeEmitir =
    usuario.podeGerarLaudos ||
    usuario.podeGerarCirurgia ||
    usuario.role === 'admin' ||
    usuario.role === 'veterinario';

  const renderMainScreenContent = () => {
    if (activeNav === 'inicio') {
      return (
        <DashboardHome
          darkMode={darkMode}
          isTabletLayout={isTablet}
          isMobileLayout={isMobile}
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
          userProfile={usuario}
          layoutConfig={layoutConfig}
          setLayoutConfig={setLayoutConfig}
          onOpenProfile={(tab = 'perfil') => openFromProfileMenu(tab)}
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
          userProfile={usuario}
          layoutConfig={layoutConfig}
          onOpenProfile={(tab = 'perfil') => openFromProfileMenu(tab)}
          onNavigateHome={() => setActiveNav('inicio')}
          onAddActivity={handleAddActivity}
          onToast={showToast}
        />
      );
    }

    if (activeNav === 'meus-padroes' && newUiEnabled) {
      return (
        <MeusPadroesPage
          darkMode={darkMode}
          isMobileLayout={isMobile}
          padroesTab={padroesTab}
          setPadroesTab={setPadroesTab}
          userProfile={usuario}
          setUserProfile={atualizarUsuarioLocal}
          onOpenPerfilMarca={() => openFromProfileMenu('perfil')}
          onToast={showToast}
        />
      );
    }

    return (
      <SettingsPage
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isMobileLayout={isMobile}
        settingsTab={newUiEnabled && (settingsTab === 'estilo' || settingsTab === 'estilo_cirurgia') ? 'perfil' : settingsTab}
        setSettingsTab={setSettingsTab}
        userProfile={usuario}
        setUserProfile={atualizarUsuarioLocal}
        activitiesCount={activities.length}
        newUiEnabled={newUiEnabled}
        onToggleNewUi={handleToggleNewUi}
        onOpenMeusPadroes={openMeusPadroes}
        onOpenAdminModal={() => setAdminModalOpen(true)}
        onToast={showToast}
      />
    );
  };

  return (
    <div
      style={{ fontFamily: "'Manrope', sans-serif" }}
      onClick={() => profileMenuOpen && setProfileMenuOpen(false)}
      className={`transition-colors duration-300 flex ${
        isMobile
          ? 'flex-col justify-between min-h-screen'
          : 'flex-row h-screen overflow-hidden'
      } ${darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'}`}
    >
      {/* Sidebar Esquerda (Desktop w-64 | Tablet w-52) */}
      {!isMobile && (
        <Sidebar
          darkMode={darkMode}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          compact={isTablet}
          showWindowDots={false}
          newUiEnabled={newUiEnabled}
          onHelpClick={() =>
            showToast('Suporte Técnico Veterinário Vetaro disponível!')
          }
        />
      )}

      {/* Área Principal Centralizada */}
      <main
        className={`flex-1 w-full ${
          isMobile
            ? 'p-4 pb-24'
            : isTablet
            ? 'p-6 h-full overflow-y-auto'
            : 'py-8 px-8 lg:px-12 h-full overflow-y-auto'
        } relative`}
      >
        <div className={`w-full ${activeNav === 'meus-padroes' && newUiEnabled ? 'max-w-7xl' : 'max-w-5xl'} mx-auto flex flex-col`}>
          {isMobile ? (
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
                    {usuario.initials}
                  </button>
                </div>
                {profileMenuOpen && (
                  <ProfileDropdown
                    isStandalone={false}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    userProfile={usuario}
                    activeNav={activeNav}
                    settingsTab={settingsTab}
                    newUiEnabled={newUiEnabled}
                    onToggleNewUi={handleToggleNewUi}
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
                  Olá, {usuario.greetingName}!
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tudo pronto para otimizar seu trabalho hoje?
                </p>
              </div>
            </>
          ) : (
            <TopHeader
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              userProfile={usuario}
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
              newUiEnabled={newUiEnabled}
              onToggleNewUi={handleToggleNewUi}
              compact={isTablet}
            />
          )}

          {/* Alerta caso a conta esteja como assistente/pendente */}
          {!podeEmitir && (
            <div className="mb-6 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-300">
                  Acesso em Modo de Consulta / Aguardando Liberação
                </p>
                <p className="mt-0.5 opacity-90">
                  Você está conectado como <strong>{usuario.email}</strong>, mas sua conta
                  ainda não possui permissão para emitir laudos e relatórios oficiais.
                </p>
              </div>
            </div>
          )}

          {renderMainScreenContent()}
        </div>
      </main>

      {/* Tab Bar Inferior Mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <MobileTabBar
            darkMode={darkMode}
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            newUiEnabled={newUiEnabled}
          />
        </div>
      )}

      {/* Modal de Detalhes de Relatório / Laudo */}
      <ReportPreviewModal
        report={selectedReport}
        darkMode={darkMode}
        onClose={() => setSelectedReport(null)}
        onToast={showToast}
        onUpdateReport={(updated) => {
          setSelectedReport(updated);
          setActivities((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
        }}
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
