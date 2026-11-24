import React, { useRef, useState, useEffect } from 'react';
import {
  FileUp,
  User,
  CreditCard,
  Settings,
  Stethoscope,
  Upload,
  ShieldCheck,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  PieChart,
  ArrowRight,
  X,
  Building2,
  Sparkles,
  FileText,
  Calendar,
  Zap,
  Image as ImageIcon,
  Move,
  Palette
} from 'lucide-react';
import { UltrasoundIcon } from '../components/icons/VetaroIcons';
import EstiloLaudoTab from '../components/EstiloLaudoTab';
import EstiloCirurgiaTab from '../components/EstiloCirurgiaTab';
import LogoCropEditorModal from '../components/modals/LogoCropEditorModal';
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
  newUiEnabled = false,
  onToggleNewUi,
  onOpenMeusPadroes,
  onOpenAdminModal,
  onToast
}) {
  const logoInputRef = useRef(null);
  const assinaturaInputRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoEditorOpen, setLogoEditorOpen] = useState(false);
  const [logoEditorSrc, setLogoEditorSrc] = useState('');
  const [logoEditorFileName, setLogoEditorFileName] = useState('logo_clinica.png');
  const [assinaturaFile, setAssinaturaFile] = useState(null);
  const [assinaturaPreview, setAssinaturaPreview] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [exibirQrCodeRodape, setExibirQrCodeRodape] = useState(false);
  const [salvandoQrPref, setSalvandoQrPref] = useState(false);

  useEffect(() => {
    api.getPreferenciaQrCodeRodape()
      .then((res) => {
        if (typeof res?.exibirQrCodeRodape === 'boolean') {
          setExibirQrCodeRodape(res.exibirQrCodeRodape);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleQrCodeRodape = async (novoValor) => {
    setExibirQrCodeRodape(novoValor);
    setSalvandoQrPref(true);
    try {
      await api.salvarPreferenciaQrCodeRodape(novoValor);
      if (onToast) {
        onToast(
          novoValor
            ? 'QR Code ativado no rodapé dos próximos PDFs!'
            : 'QR Code removido do rodapé dos próximos PDFs.'
        );
      }
    } catch (err) {
      setExibirQrCodeRodape(!novoValor);
      if (onToast) onToast('Erro ao salvar preferência de QR Code.');
    } finally {
      setSalvandoQrPref(false);
    }
  };

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    const semApp = url.replace(/^\/app\//, '/');
    if (semApp.startsWith('/uploads/')) return semApp;
    if (semApp.startsWith('uploads/')) return '/' + semApp;
    return semApp.startsWith('/') ? semApp : `/${semApp}`;
  };

  const compressImageFile = async (file, maxDimension = 1200, quality = 0.92) => {
    if (!file || !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width <= maxDimension && height <= maxDimension && file.size < 400 * 1024) {
            return resolve(file);
          }
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const isPng = file.type === 'image/png';
          const mime = isPng ? 'image/png' : 'image/jpeg';
          canvas.toBlob((blob) => {
            if (!blob) return resolve(file);
            const safeName = file.name.replace(/\.[^.]+$/, '') + (isPng ? '.png' : '.jpg');
            const compressed = new File([blob], safeName, { type: mime, lastModified: Date.now() });
            resolve(compressed);
          }, mime, quality);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const revogarBlobUrl = (url) => {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
  };

  const blobUrlsRef = useRef({ logoEditorSrc: null, logoPreview: null, assinaturaPreview: null });
  useEffect(() => {
    blobUrlsRef.current = { logoEditorSrc, logoPreview, assinaturaPreview };
  }, [logoEditorSrc, logoPreview, assinaturaPreview]);

  useEffect(() => {
    return () => {
      const { logoEditorSrc: s1, logoPreview: s2, assinaturaPreview: s3 } = blobUrlsRef.current;
      revogarBlobUrl(s1);
      revogarBlobUrl(s2);
      revogarBlobUrl(s3);
    };
  }, []);

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Permite selecionar o mesmo arquivo novamente caso o usuário cancele ou queira reajustar
    e.target.value = '';
    try {
      const compressed = await compressImageFile(file, 1600, 0.95);
      setLogoEditorFileName(file.name || 'logo_clinica.png');
      setLogoEditorSrc((prev) => {
        if (prev !== logoPreview) revogarBlobUrl(prev);
        return URL.createObjectURL(compressed);
      });
      setLogoEditorOpen(true);
    } catch (_) {
      setLogoEditorFileName(file.name || 'logo_clinica.png');
      setLogoEditorSrc((prev) => {
        if (prev !== logoPreview) revogarBlobUrl(prev);
        return URL.createObjectURL(file);
      });
      setLogoEditorOpen(true);
    }
  };

  const handleOpenExistingLogoEditor = () => {
    const srcAtual = logoPreview || getMediaUrl(userProfile.logoUrl);
    if (!srcAtual) return;
    setLogoEditorFileName(logoFile?.name || `${userProfile.clinicName || 'logo_clinica'}.png`);
    setLogoEditorSrc(srcAtual);
    setLogoEditorOpen(true);
  };

  const handleConfirmLogoEdit = (editedFile, editedPreviewUrl) => {
    setLogoFile(editedFile);
    setLogoPreview((prev) => {
      if (prev && prev !== editedPreviewUrl) revogarBlobUrl(prev);
      return editedPreviewUrl;
    });
    setLogoEditorSrc((prev) => {
      if (prev && prev !== editedPreviewUrl) revogarBlobUrl(prev);
      return null;
    });
    setLogoEditorOpen(false);
    if (onToast) {
      onToast('Logo enquadrada! Clique em "Salvar Dados do Perfil" para aplicar nos relatórios.');
    }
  };

  const handleAssinaturaSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1200, 0.92);
      setAssinaturaFile(compressed);
      setAssinaturaPreview((prev) => {
        revogarBlobUrl(prev);
        return URL.createObjectURL(compressed);
      });
    } catch (_) {
      setAssinaturaFile(file);
      setAssinaturaPreview((prev) => {
        revogarBlobUrl(prev);
        return URL.createObjectURL(file);
      });
    }
  };

  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [modalPlanoAberto, setModalPlanoAberto] = useState(false);
  const [trocandoPlano, setTrocandoPlano] = useState(false);
  const pdfCloneInputRef = useRef(null);
  const [cloningPdfs, setCloningPdfs] = useState(false);
  const [clonedSummary, setClonedSummary] = useState(null);

  const handleCloneFromPdfs = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length) return;

    setCloningPdfs(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('pdfs', f));
      const res = await api.importarPadraoPdfs(fd);
      if (res && res.perfilExtraido) {
        setClonedSummary(res.perfilExtraido);
        const idProf = res.perfilExtraido.identidadeProfissional || {};
        if (idProf.nomeMedico || idProf.crmv || idProf.nomeClinica) {
          setUserProfile({
            ...userProfile,
            name: idProf.nomeMedico || userProfile.name,
            crmv: idProf.crmv || userProfile.crmv,
            clinicName: idProf.nomeClinica || userProfile.clinicName
          });
        }
      }
      onToast(`Padrão visual (300 DPI) e estilo de escrita extraídos de ${files.length} PDF(s)!`);
    } catch (err) {
      onToast('Erro ao clonar PDFs: ' + err.message);
    } finally {
      setCloningPdfs(false);
    }
  };


  const carregarMetricasUso = async () => {
    setLoadingUsage(true);
    try {
      const res = await api.getUsoAssinatura();
      if (res && res.sucesso) {
        setUsageData(res);
      }
    } catch (err) {
      console.warn('Aviso ao carregar métricas:', err.message);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Carrega na montagem da tela e ao alternar para a aba de assinatura
  useEffect(() => {
    carregarMetricasUso();
  }, []);

  useEffect(() => {
    if (settingsTab === 'assinatura') {
      carregarMetricasUso();
    }
  }, [settingsTab]);

  useEffect(() => {
    const onAtualizada = () => carregarMetricasUso();
    window.addEventListener('vetaro:assinatura-atualizada', onAtualizada);
    return () => window.removeEventListener('vetaro:assinatura-atualizada', onAtualizada);
  }, []);

  const [cicloModal, setCicloModal] = useState('mensal');
  const [abrindoStripe, setAbrindoStripe] = useState(false);

  const handleTrocarPlano = async (novoPlano) => {
    setTrocandoPlano(true);
    try {
      const res = await api.trocarPlanoAssinatura(novoPlano, cicloModal);
      if (res && res.sucesso) {
        setUsageData(res);
        onToast(`Plano alterado com sucesso para: ${res.plano?.nome || novoPlano}!`);
      } else {
        onToast('Plano alterado com sucesso!');
        await carregarMetricasUso();
      }
      setModalPlanoAberto(false);
    } catch (err) {
      onToast(`Erro ao trocar de plano: ${err.message}`);
    } finally {
      setTrocandoPlano(false);
    }
  };

  const handleAssinarStripe = async (plano, ciclo = cicloModal) => {
    setAbrindoStripe(true);
    try {
      const res = await api.criarCheckoutStripe(plano, ciclo);
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      onToast('Não foi possível abrir o checkout da Stripe. Tente novamente.');
    } catch (err) {
      onToast(`Erro ao iniciar pagamento Stripe: ${err.message}`);
    } finally {
      setAbrindoStripe(false);
    }
  };

  const handleAbrirPortalStripe = async () => {
    setAbrindoStripe(true);
    try {
      const res = await api.abrirPortalStripe();
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      onToast('Não foi possível abrir o portal de assinatura da Stripe.');
    } catch (err) {
      onToast(`Erro ao abrir portal Stripe: ${err.message}`);
    } finally {
      setAbrindoStripe(false);
    }
  };

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
        const ts = Date.now();
        const logoUrlAtualizada = res.usuario.logoUrl
          ? `${res.usuario.logoUrl.split("?")[0]}?v=${ts}`
          : userProfile.logoUrl;
        const assinaturaUrlAtualizada = res.usuario.assinaturaUrl
          ? `${res.usuario.assinaturaUrl.split("?")[0]}?v=${ts}`
          : userProfile.assinaturaUrl;
        setUserProfile({
          ...userProfile,
          ...res.usuario,
          name: res.usuario.nome || userProfile.name,
          clinicName: res.usuario.nomeClinica || userProfile.clinicName,
          logoUrl: logoUrlAtualizada,
          assinaturaUrl: assinaturaUrlAtualizada
        });
        setLogoFile(null);
        setLogoPreview(null);
        setAssinaturaFile(null);
        setAssinaturaPreview(null);
      }
      setLogoFile(null);
      setAssinaturaFile(null);
      onToast(`Dados do perfil (${userProfile.name}) salvos com sucesso!`);
    } catch (err) {
      console.error('Erro ao atualizar perfil profissional:', err);
      onToast(`Erro ao salvar perfil/logo: ${err.message || "tente novamente"}`);
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
            ...(!newUiEnabled
              ? [
                  { id: 'estilo', label: 'Padrão de Ultrassom', icon: Sparkles },
                  { id: 'estilo_cirurgia', label: 'Padrão Cirúrgico', icon: Stethoscope }
                ]
              : []),
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

      {newUiEnabled && onOpenMeusPadroes && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            darkMode
              ? 'bg-[#0D2527]/70 border-[#00D296]/30 text-slate-200'
              : 'bg-[#E9FBF5] border-[#00D296]/40 text-[#0A141D]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00D296]/20 text-[#00D296] flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-extrabold">
                Padrões de Ultrassom e Cirurgia agora ficam no Hub Meus Padrões
              </p>
              <p className="text-[11px] opacity-80">
                Edite fontes, cores, assinatura e veja seu PDF ao vivo em um só lugar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenMeusPadroes('ultrassom')}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00ba84] transition inline-flex items-center gap-1.5"
            >
              <span>Abrir Meus Padrões</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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

            {/* Uploads Multi-Médico de Logotipo e Assinatura Digital com Pré-visualização Instantânea */}
            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pt-1`}>
              {/* Card de Logotipo */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
                darkMode ? 'bg-[#0A141D] border-slate-700/70' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <ImageIcon className="w-3.5 h-3.5 text-[#00D296]" />
                    <span>Logotipo da Clínica</span>
                  </div>
                  {logoPreview ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Alteração pendente
                    </span>
                  ) : userProfile.logoUrl ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/30">
                      Ativo no sistema
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Não configurado
                    </span>
                  )}
                </div>

                {(logoPreview || userProfile.logoUrl) ? (
                  <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-slate-700/40">
                    <div className="w-20 h-12 bg-white rounded flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-inner">
                      <img
                        src={logoPreview || getMediaUrl(userProfile.logoUrl)}
                        alt="Logotipo Clínica"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-slate-200">
                        {logoFile ? logoFile.name : (userProfile.clinicName || 'Logotipo Oficial')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Exibido nos cabeçalhos de cirurgia e laudos
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Faça o upload da imagem da sua clínica (PNG, JPG ou WEBP).
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current && logoInputRef.current.click()}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      darkMode
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-[#00D296]'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-[#0D5C56]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-[#00D296]" />
                    <span>
                      {(logoPreview || userProfile.logoUrl) ? 'Substituir' : 'Selecionar Logotipo (PNG/JPG)'}
                    </span>
                  </button>
                  {(logoPreview || userProfile.logoUrl) && (
                    <button
                      type="button"
                      onClick={handleOpenExistingLogoEditor}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        darkMode
                          ? 'bg-[#00D296]/15 border-[#00D296]/40 text-[#00D296] hover:bg-[#00D296]/25'
                          : 'bg-[#0D5C56]/10 border-[#0D5C56]/30 text-[#0D5C56] hover:bg-[#0D5C56]/20'
                      }`}
                      title="Ajustar zoom, alinhamento e posição da logo no cabeçalho"
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Ajustar Posição</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card de Assinatura Digital */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
                darkMode ? 'bg-[#0A141D] border-slate-700/70' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  ref={assinaturaInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleAssinaturaSelect}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D296]" />
                    <span>Assinatura / Carimbo</span>
                  </div>
                  {assinaturaPreview ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Alteração pendente
                    </span>
                  ) : userProfile.assinaturaUrl ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] border border-[#00D296]/30">
                      Ativa no sistema
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Não configurada
                    </span>
                  )}
                </div>

                {(assinaturaPreview || userProfile.assinaturaUrl) ? (
                  <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-slate-700/40">
                    <div className="w-20 h-12 bg-white rounded flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-inner">
                      <img
                        src={assinaturaPreview || getMediaUrl(userProfile.assinaturaUrl)}
                        alt="Assinatura Digital"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-slate-200">
                        {assinaturaFile ? assinaturaFile.name : (userProfile.name || 'Assinatura Médica')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Exibida com CRMV no rodapé dos documentos
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Faça o upload do seu carimbo ou assinatura escaneada.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => assinaturaInputRef.current && assinaturaInputRef.current.click()}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    darkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-[#00D296]'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-[#0D5C56]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-[#00D296]" />
                  <span>
                    {(assinaturaPreview || userProfile.assinaturaUrl) ? 'Substituir Assinatura' : 'Selecionar Assinatura (PNG/JPG)'}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <p className="text-xs font-extrabold">Exibir QR Code no rodapé dos PDFs</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Opcional (desmarcado por padrão). Imprime um QR Code discreto no rodapé dos laudos e cirurgias para acesso digital rápido.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={exibirQrCodeRodape}
                  disabled={salvandoQrPref}
                  onChange={(e) => handleToggleQrCodeRodape(e.target.checked)}
                  className="w-4 h-4 accent-[#00D296]"
                />
                <span className="text-xs font-bold">
                  {exibirQrCodeRodape ? 'Ativo' : 'Desativado'}
                </span>
              </label>
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

      {/* ABA: ESTILO & PADRÃO DE LAUDO (APRENDIZADO POR IA) */}
      {settingsTab === 'estilo' && (
        <EstiloLaudoTab
          darkMode={darkMode}
          isMobileLayout={isMobileLayout}
          onToast={onToast}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />
      )}

      {/* ABA: COPIAR PADRÃO DE RELATÓRIO CIRÚRGICO */}
      {settingsTab === 'estilo_cirurgia' && (
        <EstiloCirurgiaTab
          darkMode={darkMode}
          isMobileLayout={isMobileLayout}
          onToast={onToast}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />
      )}

      {/* ABA 2: PLANO, COTAS E CONTROLE DE GASTOS */}
      {settingsTab === 'assinatura' && (() => {
        if (loadingUsage && !usageData) {
          return (
            <div className={`p-12 text-center rounded-2xl border flex flex-col items-center justify-center gap-3 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 border-2 border-[#00D296] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-400">
                Carregando detalhes da assinatura e consumo de cotas...
              </p>
            </div>
          );
        }

        const isGratuito = (usageData?.plano?.chave || '').toUpperCase() === 'GRATUITO' || (usageData?.plano?.preco === 0);

        const p = usageData?.plano || {
          nome: 'Degustação Gratuita',
          chave: 'GRATUITO',
          preco: 0.0,
          ciclo: 'mensal',
          status: 'TRIAL',
          diasRestantes: 30,
          cicloFim: new Date(Date.now() + 30 * 86400000).toISOString(),
          cartaoBandeira: null,
          cartaoFinal: null,
          descricao: '5 laudos gratuitos para testar a ferramenta com IA + Cirurgias ilimitadas'
        };
        const c = usageData?.cota || {
          limite: 10,
          consumido: activitiesCount || 0,
          disponivel: Math.max(0, 10 - (activitiesCount || 0)),
          porcentagem: Math.min(100, Number((((activitiesCount || 0) / 10) * 100).toFixed(1)))
        };
        const b = usageData?.breakdown || {
          ultrassom: activitiesCount || 0,
          cirurgia: 0,
          totalDocumentos: activitiesCount || 0,
          excedenteQtd: 0,
          excedenteValor: 0
        };
        const m = usageData?.metricasValor || {
          horasEconomizadas: Number((((activitiesCount || 0) * 25) / 60).toFixed(1)),
          custoEfetivoUnitario: 0.0,
          faturamentoEstimado: (activitiesCount || 0) * 160
        };
        const historico = usageData?.historicoMeses || [];
        const maxHistoricoTotal = Math.max(1, ...historico.map((h) => h.total || 0));
        const faturas = usageData?.faturas || [];

        const progressColor =
          c.porcentagem > 90 ? 'bg-rose-500' : c.porcentagem > 75 ? 'bg-amber-400' : 'bg-[#00D296]';

        return (
          <div className="space-y-6">
            {/* 1. Header do Plano e Resumo de Cota */}
            <div
              className={`p-6 sm:p-7 rounded-2xl border transition ${
                darkMode
                  ? 'bg-gradient-to-br from-[#11232E] to-[#0A1A22] border-teal-500/30'
                  : 'bg-gradient-to-br from-[#E8F8F3] to-[#DDF5ED] border-[#C3EFE2]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-teal-500/20">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#00D296] text-[#062E2B] tracking-wide">
                      PLANO ATIVO: {p.nome.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      • {isGratuito ? 'Degustação (5 laudos cortesia)' : 'Renovação automática'}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {isGratuito ? (
                      <>
                        R$ 0,00
                        <span className="text-xs sm:text-sm font-semibold opacity-80">
                          {' '}
                          / 5 laudos gratuitos
                        </span>
                      </>
                    ) : (
                      <>
                        R$ {Number(p.preco).toFixed(2).replace('.', ',')}
                        <span className="text-xs sm:text-sm font-semibold opacity-80">
                          {' '}
                          / {p.ciclo === 'anual' ? 'mês (anual)' : 'mês'}
                        </span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00D296]" />
                    <span>
                      {isGratuito ? 'Período de teste válido por' : 'Renovação em'}{' '}
                      <strong>{p.diasRestantes} dias</strong> (
                      {new Date(p.cicloFim).toLocaleDateString('pt-BR')})
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(p.stripeCustomerId || !isGratuito) && (
                    <button
                      type="button"
                      disabled={abrindoStripe}
                      onClick={handleAbrirPortalStripe}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition flex items-center gap-1.5 disabled:opacity-60 ${
                        darkMode
                          ? 'bg-[#0A141D] border-slate-700 text-slate-200 hover:border-[#00D296]'
                          : 'bg-white border-slate-300 text-slate-800 hover:border-[#0D5C56]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#00D296]" />
                      <span>{abrindoStripe ? 'Abrindo...' : 'Gerenciar Faturas e Cartão'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModalPlanoAberto(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#0D5C56] text-white hover:bg-[#094742] dark:bg-[#00D296] dark:text-[#062E2B] dark:hover:bg-[#00e6a4] transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGratuito ? 'Fazer Upgrade de Plano' : 'Mudar de Plano'}</span>
                  </button>
                </div>
              </div>

              {p.status === 'PAST_DUE' && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pagamento pendente:</strong> não conseguimos cobrar seu cartão na renovação. Atualize o cartão no portal Stripe para liberar novos laudos.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={abrindoStripe}
                    onClick={handleAbrirPortalStripe}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-extrabold shrink-0 hover:bg-rose-400 transition"
                  >
                    Atualizar Cartão
                  </button>
                </div>
              )}

              {p.cancelAtPeriodEnd && p.status !== 'CANCELED' && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center gap-2 text-xs text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Cancelamento agendado para <strong>{new Date(p.cicloFim).toLocaleDateString('pt-BR')}</strong>. Você pode reativar a qualquer momento em <strong>Gerenciar Faturas e Cartão</strong>.
                  </span>
                </div>
              )}

              {/* Barra de Progresso de Cota Disponível */}
              <div className="pt-5 space-y-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold">
                      Quantidade disponível no mês:
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#00D296] leading-none mt-1">
                      {c.disponivel}{' '}
                      <span className="text-xs sm:text-sm font-bold text-slate-400">
                        laudos restantes
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium">
                      Consumido: <strong>{c.consumido}</strong> de {c.limite} laudos
                    </span>
                    <span className="text-xs font-extrabold ml-2 text-slate-300">
                      ({c.porcentagem}%)
                    </span>
                  </div>
                </div>

                {/* Trilho da Barra */}
                <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden p-0.5">
                  <div
                    style={{ width: `${Math.min(100, Math.max(2, c.porcentagem))}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  />
                </div>

                {c.porcentagem >= 80 && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Você já utilizou <strong>{c.porcentagem}%</strong> da sua cota mensal. Ao atingir
                      100% do limite, a emissão de novos laudos de ultrassom será pausada até a próxima renovação ou upgrade de plano.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Três Métricas Chave (KPIs Financeiros & Produtividade) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className={`p-5 rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">Tempo Economizado</span>
                  <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#00D296]">
                  ~{m.horasEconomizadas}h
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Tempo de digitação poupado neste ciclo (base ~25 min/exame).
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">Custo Médio / Laudo</span>
                  <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#00D296]">
                  R$ {Number(m.custoEfetivoUnitario).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Custo real de cada laudo emitido dentro da sua assinatura.
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">Faturamento Estimado</span>
                  <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#00D296]">
                  R$ {Number(m.faturamentoEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Receita gerada em exames (a Vetaro representa &lt; 1% do seu faturamento).
                </p>
              </div>
            </div>

            {/* 3. Painel de Uso nos Últimos Meses & Divisão de Gastos */}
            <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
              {/* Gráfico de Barras: Evolução dos Últimos Meses */}
              <div
                className={`${
                  isMobileLayout ? '' : 'col-span-7'
                } p-6 rounded-2xl border space-y-4 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00D296]" />
                    <h4 className="text-sm font-extrabold">Uso nos Últimos Meses</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Total: {historico.reduce((acc, h) => acc + (h.total || 0), 0)} documentos
                  </span>
                </div>

                {/* Visualizador de Barras CSS */}
                <div className="pt-4 pb-2 flex items-end justify-between gap-3 h-44 border-b border-slate-200 dark:border-slate-800">
                  {historico.map((h, i) => {
                    const pct = Math.max(10, Math.round(((h.total || 0) / maxHistoricoTotal) * 100));
                    const isAtual = i === historico.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#00D296] transition">
                          {h.total}
                        </span>
                        <div className="w-full max-w-[34px] rounded-t-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:opacity-90" style={{ height: `${pct}%` }}>
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full rounded-t-lg transition-all ${
                              isAtual ? 'bg-[#00D296]' : 'bg-[#0D5C56]/70 dark:bg-[#00D296]/50'
                            }`}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold mt-1 ${isAtual ? 'text-[#00D296] font-bold' : 'text-slate-400'}`}>
                          {h.mes}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#00D296]" />
                    <span>Mês atual em andamento</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#0D5C56]/70 dark:bg-[#00D296]/50" />
                    <span>Meses anteriores</span>
                  </span>
                </div>
              </div>

              {/* Divisão dos Gastos (Breakdown por Serviço) */}
              <div
                className={`${
                  isMobileLayout ? '' : 'col-span-5'
                } p-6 rounded-2xl border space-y-4 ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#00D296]" />
                  <h4 className="text-sm font-extrabold">Divisão dos Gastos no Ciclo</h4>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Item 1: Ultrassom */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                        <UltrasoundIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Ultrassonografia Abdominal</p>
                        <p className="text-[10px] text-slate-400">Consumo da cota contratada</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#00D296]">
                      {b.ultrassom} laudos
                    </span>
                  </div>

                  {/* Item 2: Cirurgia */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Relatórios Cirúrgicos</p>
                        <p className="text-[10px] text-slate-400">Ilimitados no seu plano</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#00D296]">
                      {b.cirurgia} fichas
                    </span>
                  </div>

                  {/* Item 3: Proteção contra Excedentes */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Limite de Cota Protegido</p>
                        <p className="text-[10px] text-slate-400">Sem cobranças surpresa ao atingir o limite</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#00D296]">
                      Bloqueio ativo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Método de Pagamento & Faturas Reais */}
            <div
              className={`p-6 rounded-2xl border space-y-4 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold">Método de Pagamento & Faturas</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cobranças processadas com segurança e notas fiscais automáticas.
                  </p>
                </div>
                {p.cartaoFinal ? (
                  <div className="p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A141D] flex items-center gap-3 text-xs">
                    <CreditCard className="w-4 h-4 text-[#00D296]" />
                    <span className="font-bold">
                      {p.cartaoBandeira || 'Cartão'} •••• {p.cartaoFinal}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold">
                      Padrão
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A141D] flex items-center gap-2.5 text-xs text-slate-400">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Nenhum cartão cadastrado ({isGratuito ? 'Plano Gratuito' : 'Sem cartão'})</span>
                  </div>
                )}
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs pt-2">
                {faturas.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    {isGratuito
                      ? 'Nenhuma fatura a pagar. Você está no plano Degustação Gratuita (5 laudos de cortesia).'
                      : 'Nenhuma fatura registrada no período.'}
                  </div>
                ) : (
                  faturas.map((fat) => (
                    <div key={fat.id} className="py-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">
                          {new Date(fat.data).toLocaleDateString('pt-BR')} — {fat.descricao || `Vetaro ${p.nome}`}
                        </p>
                        <p className="text-[10px] text-slate-400">Comprovante de pagamento emitido</p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap justify-end">
                        <span className="font-extrabold text-[#00D296]">
                          R$ {Number(fat.valor).toFixed(2).replace('.', ',')}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            fat.status === 'pago'
                              ? 'bg-[#00D296]/15 text-[#00D296]'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {fat.status === 'pago' ? 'Pago' : fat.status === 'pendente' ? 'Pendente' : fat.status}
                        </span>
                        {fat.pdfUrl && (
                          <a
                            href={fat.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border border-slate-700 hover:border-[#00D296] text-slate-300 hover:text-white transition"
                          >
                            PDF
                          </a>
                        )}
                        {fat.hostedInvoiceUrl && (
                          <a
                            href={fat.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border border-slate-700 hover:border-[#00D296] text-slate-300 hover:text-white transition"
                          >
                            Recibo
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal de Troca de Plano */}
            {modalPlanoAberto && (
              <div
                onClick={() => setModalPlanoAberto(false)}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-3xl rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl relative ${
                    darkMode
                      ? 'bg-[#0F1C26] border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-[#0A141D]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setModalPlanoAberto(false)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-extrabold">Escolha seu Plano Vetaro</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Pagamento seguro com cartão de crédito via Stripe • Cancele quando quiser.
                      </p>
                    </div>

                    {/* Seletor Mensal / Anual */}
                    <div
                      className={`p-1 rounded-xl border inline-flex items-center gap-1 self-start ${
                        darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCicloModal('mensal')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                          cicloModal === 'mensal'
                            ? 'bg-[#00D296] text-[#062E2B]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setCicloModal('anual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                          cicloModal === 'anual'
                            ? 'bg-[#00D296] text-[#062E2B]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Anual</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-950/50 text-[#00D296] font-black">
                          -20%
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Licença Administrador (somente para contas role === 'admin') */}
                    {userProfile?.role === 'admin' && (
                      <div
                        className={`p-5 rounded-2xl border flex flex-col justify-between sm:col-span-3 transition ${
                          p.chave === 'ILIMITADO' || p.chave === 'ADMIN'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : darkMode
                            ? 'border-emerald-500/40 bg-[#0E2822]'
                            : 'border-emerald-300 bg-emerald-50/70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-[#062E2B]">
                                ADMIN / ILIMITADO
                              </span>
                              <h4 className="text-sm font-extrabold text-emerald-400">Licença Administrador (Ilimitado)</h4>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Acesso completo com emissão irrestrita de laudos de ultrassom e cirurgias sem trava de cota.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={trocandoPlano || p.chave === 'ILIMITADO' || p.chave === 'ADMIN'}
                            onClick={() => handleTrocarPlano('ILIMITADO')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition shrink-0 ${
                              p.chave === 'ILIMITADO' || p.chave === 'ADMIN'
                                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-[#062E2B]'
                            }`}
                          >
                            {p.chave === 'ILIMITADO' || p.chave === 'ADMIN' ? '✓ Licença Ativa' : 'Ativar Licença Admin'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Solo */}
                    <div
                      className={`p-5 rounded-2xl border flex flex-col justify-between ${
                        p.chave === 'SOLO'
                          ? 'border-[#00D296] bg-[#00D296]/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-extrabold">Solo / Volante</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Até 40 laudos/mês • Cirurgias ilimitadas</p>
                        <p className="text-xl font-extrabold mt-3">
                          R$ {cicloModal === 'anual' ? '99' : '119'}
                          <span className="text-xs font-normal">/mês</span>
                        </p>
                        {cicloModal === 'anual' && (
                          <p className="text-[10px] text-[#00D296] font-bold mt-0.5">R$ 1.188/ano no cartão</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={abrindoStripe || (p.chave === 'SOLO' && p.ciclo === cicloModal)}
                        onClick={() => handleAssinarStripe('SOLO', cicloModal)}
                        className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-[#00D296] transition disabled:opacity-50"
                      >
                        {p.chave === 'SOLO' && p.ciclo === cicloModal
                          ? 'Plano Atual'
                          : abrindoStripe
                          ? 'Redirecionando...'
                          : 'Assinar Solo'}
                      </button>
                    </div>

                    {/* Pro */}
                    <div
                      className={`p-5 rounded-2xl border flex flex-col justify-between relative ${
                        p.chave === 'PRO'
                          ? 'border-[#00D296] bg-[#00D296]/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00D296] text-[#062E2B] text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                        MAIS POPULAR
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold">Especialista Pro</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Até 150 laudos/mês • Cirurgias ilimitadas</p>
                        <p className="text-xl font-extrabold mt-3">
                          R$ {cicloModal === 'anual' ? '209' : '249'}
                          <span className="text-xs font-normal">/mês</span>
                        </p>
                        {cicloModal === 'anual' && (
                          <p className="text-[10px] text-[#00D296] font-bold mt-0.5">R$ 2.508/ano no cartão</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={abrindoStripe || (p.chave === 'PRO' && p.ciclo === cicloModal)}
                        onClick={() => handleAssinarStripe('PRO', cicloModal)}
                        className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition disabled:opacity-50"
                      >
                        {p.chave === 'PRO' && p.ciclo === cicloModal
                          ? 'Plano Atual'
                          : abrindoStripe
                          ? 'Redirecionando...'
                          : 'Assinar Pro'}
                      </button>
                    </div>

                    {/* Clinica */}
                    <div
                      className={`p-5 rounded-2xl border flex flex-col justify-between ${
                        p.chave === 'CLINICA'
                          ? 'border-[#00D296] bg-[#00D296]/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-extrabold">Clínica & Hospital</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Até 350 laudos/mês • Cirurgias ilimitadas</p>
                        <p className="text-xl font-extrabold mt-3">
                          R$ {cicloModal === 'anual' ? '419' : '497'}
                          <span className="text-xs font-normal">/mês</span>
                        </p>
                        {cicloModal === 'anual' && (
                          <p className="text-[10px] text-[#00D296] font-bold mt-0.5">R$ 5.028/ano no cartão</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={abrindoStripe || (p.chave === 'CLINICA' && p.ciclo === cicloModal)}
                        onClick={() => handleAssinarStripe('CLINICA', cicloModal)}
                        className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-[#00D296] transition disabled:opacity-50"
                      >
                        {p.chave === 'CLINICA' && p.ciclo === cicloModal
                          ? 'Plano Atual'
                          : abrindoStripe
                          ? 'Redirecionando...'
                          : 'Assinar Clínica'}
                      </button>
                    </div>

                    {/* Modo Degustação / Teste (somente Admin) */}
                    {userProfile?.role === 'admin' && (
                      <div className="sm:col-span-3 pt-2 text-center">
                        <button
                          type="button"
                          disabled={trocandoPlano || p.chave === 'GRATUITO'}
                          onClick={() => handleTrocarPlano('GRATUITO')}
                          className="text-xs text-slate-400 hover:text-slate-200 underline font-medium transition"
                        >
                          {p.chave === 'GRATUITO'
                            ? 'Atualmente na Degustação Gratuita (5 laudos)'
                            : 'Simular Modo Degustação Gratuita (5 laudos / Teste de Cota)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Modal Interativo de Posicionamento e Enquadramento do Logotipo */}
      <LogoCropEditorModal
        isOpen={logoEditorOpen}
        imageSrc={logoEditorSrc}
        originalFileName={logoEditorFileName}
        clinicName={userProfile.clinicName}
        darkMode={darkMode}
        onCancel={() => setLogoEditorOpen(false)}
        onConfirm={handleConfirmLogoEdit}
      />
    </div>
  );
}
