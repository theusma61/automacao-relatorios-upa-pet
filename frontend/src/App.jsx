import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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
import DashboardHome from './pages/DashboardHome';

const ReportPreviewModal = lazy(() => import('./components/modals/ReportPreviewModal'));
const ShareReportModal = lazy(() => import('./components/modals/ShareReportModal'));
const AdminUsersModal = lazy(() => import('./components/modals/AdminUsersModal'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const UltrasoundGenerator = lazy(() => import('./pages/UltrasoundGenerator'));
const SurgeryGenerator = lazy(() => import('./pages/SurgeryGenerator'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MeusPadroesPage = lazy(() => import('./pages/MeusPadroesPage'));
const ClinicasFinanceiroPage = lazy(() => import('./pages/ClinicasFinanceiroPage'));

function LazyFallback({ darkMode }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className={`w-7 h-7 rounded-full border-2 border-t-transparent animate-spin ${
          darkMode ? 'border-[#00D296]' : 'border-[#0D5C56]'
        }`}
      />
    </div>
  );
}

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
  const [newUiEnabled, setNewUiEnabled] = useState(true);
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
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [shareReportTarget, setShareReportTarget] = useState(null);
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

  const mapearHistoricoServidor = useCallback((res) => {
    const exames = Array.isArray(res?.exames) ? res.exames : [];
    const cirurgias = Array.isArray(res?.cirurgias) ? res.cirurgias : [];

    const mappedExames = exames.map((ex) => {
      const jobId = ex.pdfArquivo ? ex.pdfArquivo.split('/')[2] : '';
      return {
        id: `ex-${ex.id}`,
        dbId: ex.id,
        jobId,
        publicToken: ex.publicToken || '',
        linkAtivo: ex.linkAtivo !== false,
        visualizacoes: ex.visualizacoes || 0,
        ultimaVisualizacaoEm: ex.ultimaVisualizacaoEm || null,
        compartilhadoEm: ex.compartilhadoEm || null,
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
        dbId: c.id,
        jobId,
        publicToken: c.publicToken || '',
        linkAtivo: c.linkAtivo !== false,
        visualizacoes: c.visualizacoes || 0,
        ultimaVisualizacaoEm: c.ultimaVisualizacaoEm || null,
        compartilhadoEm: c.compartilhadoEm || null,
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

    return [...mappedExames, ...mappedCirurgias].sort((a, b) => b.timestamp - a.timestamp);
  }, []);

  const carregarHistoricoServidor = useCallback(async () => {
    if (!usuario) return;
    setLoadingHistory(true);
    try {
      const limit = 25;
      const res = await api.getHistorico({ limit, offset: 0 });
      const combined = mapearHistoricoServidor(res);
      setActivities(combined);
      setHistoryOffset(limit);
      setHistoryHasMore(
        typeof res.hasMore === 'boolean'
          ? res.hasMore
          : (res.exames?.length || 0) >= limit || (res.cirurgias?.length || 0) >= limit
      );
    } catch (_) {
      setActivities([]);
      setHistoryHasMore(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [usuario, mapearHistoricoServidor]);

  const carregarMaisHistorico = useCallback(async () => {
    if (!usuario || loadingMoreHistory || !historyHasMore) return;
    setLoadingMoreHistory(true);
    try {
      const limit = 25;
      const res = await api.getHistorico({ limit, offset: historyOffset });
      const novos = mapearHistoricoServidor(res);
      setActivities((prev) => {
        const vistos = new Set(prev.map((item) => item.id));
        const mesclados = [...prev];
        for (const item of novos) {
          if (!vistos.has(item.id)) {
            vistos.add(item.id);
            mesclados.push(item);
          }
        }
        return mesclados.sort((a, b) => b.timestamp - a.timestamp);
      });
      setHistoryOffset((prev) => prev + limit);
      setHistoryHasMore(
        typeof res.hasMore === 'boolean'
          ? res.hasMore
          : (res.exames?.length || 0) >= limit || (res.cirurgias?.length || 0) >= limit
      );
    } catch (_) {
      showToast('Não foi possível carregar mais registros do histórico.');
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [usuario, loadingMoreHistory, historyHasMore, historyOffset, mapearHistoricoServidor, showToast]);

  useEffect(() => {
    if (usuario) {
      carregarHistoricoServidor();
      try {
        const key = `vetaro_new_ui_v2_${usuario.id || usuario.email || 'default'}`;
        const savedUi = localStorage.getItem(key);
        setNewUiEnabled(savedUi === null ? true : savedUi === 'true');
      } catch (_) {}

      // Trata retorno do Stripe Checkout / Customer Portal
      try {
        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get('stripe_status');
        const sessionId = params.get('session_id');
        if (stripeStatus) {
          setActiveNav('configuracoes');
          setSettingsTab('assinatura');
          if (stripeStatus === 'success' && sessionId) {
            api
              .confirmarSessaoStripe(sessionId)
              .then((res) => {
                showToast(
                  res?.plano
                    ? `✅ Assinatura ${res.plano} ativada! Sua nova cota já está liberada.`
                    : '✅ Pagamento confirmado! Sua assinatura foi atualizada.'
                );
                window.dispatchEvent(new CustomEvent('vetaro:assinatura-atualizada'));
              })
              .catch(() => {
                showToast('✅ Pagamento confirmado! Aguardando sincronização do webhook...');
              });
          } else if (stripeStatus === 'success') {
            showToast('✅ Pagamento confirmado! Sua assinatura e cota estão sendo atualizadas.');
          } else if (stripeStatus === 'cancel') {
            showToast('Checkout cancelado. Nenhuma cobrança foi realizada.');
          } else if (stripeStatus === 'portal') {
            showToast('Dados da assinatura sincronizados com a Stripe.');
          }
          params.delete('stripe_status');
          params.delete('session_id');
          const cleanUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch (_) {}
    }
  }, [carregarHistoricoServidor, usuario, showToast]);

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
          <Suspense fallback={<LazyFallback darkMode={darkMode} />}>
            <LandingPage
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onStartFree={() => setShowLanding(false)}
              onLogin={() => setShowLanding(false)}
              onOpenSupport={() =>
                showToast('Suporte Vetaro: contato@vetaro.com.br ou WhatsApp Oficial')
              }
            />
          </Suspense>
          <Toast message={toastMessage} />
        </>
      );
    }

    return (
      <>
        <Suspense fallback={<LazyFallback darkMode={darkMode} />}>
          <LoginPage
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            ssoConfig={ssoConfig}
            onGoogleCredential={loginComGoogleCredential}
            onBackToLanding={() => setShowLanding(true)}
            onToast={showToast}
          />
        </Suspense>
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
          loadingMoreHistory={loadingMoreHistory}
          hasMoreHistory={historyHasMore}
          onRefreshHistory={carregarHistoricoServidor}
          onLoadMoreHistory={carregarMaisHistorico}
          onNavigate={(dest) => setActiveNav(dest)}
          onSelectReport={(rep) => setSelectedReport(rep)}
          onShareReport={(rep) => setShareReportTarget(rep)}
        />
      );
    }

    if (activeNav === 'ultrassom') {
      return (
        <UltrasoundGenerator
          darkMode={darkMode}
          isMobileLayout={isMobile}
          newUiEnabled={newUiEnabled}
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
          isMobileLayout={isMobile}
          newUiEnabled={newUiEnabled}
          userProfile={usuario}
          layoutConfig={layoutConfig}
          onOpenProfile={(tab = 'perfil') => openFromProfileMenu(tab)}
          onNavigateHome={() => setActiveNav('inicio')}
          onAddActivity={handleAddActivity}
          onToast={showToast}
        />
      );
    }

    if (activeNav === 'volante') {
      return (
        <ClinicasFinanceiroPage
          darkMode={darkMode}
          userProfile={usuario}
          setUserProfile={atualizarUsuarioLocal}
          onOpenAssinatura={() => openFromProfileMenu('assinatura')}
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
            ? newUiEnabled
              ? 'px-3.5 pt-3 pb-36'
              : 'p-4 pb-24'
            : isTablet
            ? 'p-6 h-full overflow-y-auto'
            : 'py-8 px-8 lg:px-12 h-full overflow-y-auto'
        } relative`}
      >
        <div className={`w-full ${activeNav === 'meus-padroes' && newUiEnabled ? 'max-w-7xl' : 'max-w-5xl'} mx-auto flex flex-col`}>
          {isMobile ? (
            <>
              <div
                className={`flex items-center justify-between relative ${
                  newUiEnabled
                    ? `sticky top-0 z-20 -mx-3.5 px-3.5 py-2.5 mb-3.5 border-b backdrop-blur-xl ${
                        darkMode
                          ? 'bg-[#0A141D]/90 border-slate-800/80'
                          : 'bg-[#F8FAFC]/90 border-slate-200/80'
                      }`
                    : 'mb-5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveNav('inicio')}
                    className="shrink-0"
                    aria-label="Ir para Início"
                  >
                    <VetaroLogo size={newUiEnabled ? 24 : 26} dark={darkMode} textSize={newUiEnabled ? 'text-lg' : 'text-xl'} />
                  </button>
                  {newUiEnabled && activeNav !== 'inicio' && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border truncate ${
                        darkMode
                          ? 'bg-[#0F1C26] border-slate-800 text-slate-300'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {activeNav === 'ultrassom'
                        ? 'Ultrassom'
                        : activeNav === 'relatorio'
                        ? 'Cirurgia'
                        : activeNav === 'meus-padroes'
                        ? 'Meus Padrões'
                        : 'Ajustes'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showToast('Nenhuma notificação pendente.')}
                    className="p-2 rounded-full relative"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00D296]" />
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

              {(!newUiEnabled || activeNav === 'inicio') && (
                <div className={newUiEnabled ? 'mb-4' : 'mb-5'}>
                  <h2 className={`${newUiEnabled ? 'text-xl' : 'text-2xl'} font-extrabold tracking-tight`}>
                    Olá, {usuario.greetingName}!
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tudo pronto para otimizar seu trabalho hoje?
                  </p>
                </div>
              )}
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
                  Conta em Modo de Consulta / Suspensa
                </p>
                <p className="mt-0.5 opacity-90">
                  Você está conectado como <strong>{usuario.email}</strong>, mas sua conta
                  está restrita ao modo somente visualização. Entre em contato com o suporte para reativar a emissão de laudos.
                </p>
              </div>
            </div>
          )}

          <Suspense fallback={<LazyFallback darkMode={darkMode} />}>
            {renderMainScreenContent()}
          </Suspense>
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

      {/* Modal Rápido de Compartilhamento (WhatsApp / Link Público) */}
      {shareReportTarget && (
        <Suspense fallback={null}>
          <ShareReportModal
            isOpen={Boolean(shareReportTarget)}
            onClose={() => setShareReportTarget(null)}
            tipo={shareReportTarget.type === 'relatorio' ? 'cirurgia' : 'ultrassom'}
            documentoId={shareReportTarget.dbId || shareReportTarget.jobId || ''}
            pacienteNome={shareReportTarget.paciente?.nome || shareReportTarget.patient || 'Paciente'}
            pacienteEspecie={shareReportTarget.paciente?.especie || ''}
            tutorNome={shareReportTarget.paciente?.tutor || shareReportTarget.tutor || ''}
            procedimento={shareReportTarget.cirurgia?.procedimento || ''}
            darkMode={darkMode}
            onToast={showToast}
            onStatusChanged={({ id, linkAtivo }) => {
              setActivities((prev) =>
                prev.map((item) =>
                  item.dbId === id || item.id === shareReportTarget.id
                    ? { ...item, linkAtivo }
                    : item
                )
              );
            }}
          />
        </Suspense>
      )}

      {/* Modal de Detalhes de Relatório / Laudo (carregado sob demanda) */}
      {selectedReport && (
        <Suspense fallback={null}>
          <ReportPreviewModal
            report={selectedReport}
            darkMode={darkMode}
            newUiEnabled={newUiEnabled}
            initialOrigin="history"
            onClose={() => setSelectedReport(null)}
            onToast={showToast}
            onUpdateReport={(updated) => {
              setSelectedReport(updated);
              setActivities((prev) =>
                prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
              );
            }}
          />
        </Suspense>
      )}

      {/* Modal Administrativo RBAC (carregado sob demanda) */}
      {adminModalOpen && (
        <Suspense fallback={null}>
          <AdminUsersModal
            darkMode={darkMode}
            isOpen={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            onToast={showToast}
          />
        </Suspense>
      )}

      {/* Toast Flutuante */}
      <Toast message={toastMessage} />
    </div>
  );
}
