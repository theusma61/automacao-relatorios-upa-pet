import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export function computeInitials(name = '') {
  const clean = String(name || '')
    .replace(/^(Dra?\.?\s+)/i, '')
    .trim();
  if (!clean) return 'VT';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function computeGreetingName(name = '') {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Dra. Mariana';
  const parts = trimmed.split(/\s+/);
  if (/^Dra?\.?$/i.test(parts[0]) && parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

export const DEMO_USER_PROFILE = {
  id: 'demo-vetaro-user',
  nome: 'Mariana Duarte',
  greetingName: 'Dra. Mariana',
  initials: 'MD',
  email: 'maria@clinica.com.br',
  crmv: 'CRMV-SP 48.291',
  specialty: 'Diagnóstico por Imagem & Ultrassonografia Veterinária',
  nomeClinica: 'Centro Diagnóstico VetCare',
  phone: '(11) 99812-4500',
  plan: 'Vetaro Pro IA (Ilimitado)',
  role: 'admin',
  roleDescricao: 'Administrador',
  podeGerarLaudos: true,
  podeGerarCirurgia: true,
  aiTone: 'tecnico',
  autoMeasurements: true,
  voiceDictation: true,
  includeHeaderLogo: true,
  isDemo: true
};

export function AuthProvider({ children }) {
  const { syncThemeFromUser } = useTheme();
  const [usuario, setUsuarioState] = useState(null);
  const [ssoConfig, setSsoConfig] = useState({ googleClientId: '', ssoAtivo: false });
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [modoDemo, setModoDemo] = useState(false);

  const enrichUser = useCallback((u) => {
    if (!u) return null;
    const nome = u.nome || u.name || 'Mariana Duarte';
    return {
      ...DEMO_USER_PROFILE,
      ...u,
      nome,
      name: nome,
      greetingName: computeGreetingName(nome),
      initials: computeInitials(nome),
      crmv: u.crmv || 'CRMV/MG: 22904',
      nomeClinica: u.nomeClinica || u.clinicName || 'UPA PET',
      clinicName: u.nomeClinica || u.clinicName || 'UPA PET',
      isDemo: Boolean(u.isDemo)
    };
  }, []);

  const refreshAuth = useCallback(async () => {
    setCarregandoSessao(true);
    try {
      const [cfgRes, meRes] = await Promise.allSettled([api.getAuthConfig(), api.getMe()]);
      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        setSsoConfig(cfgRes.value);
      }
      if (meRes.status === 'fulfilled' && meRes.value?.usuario) {
        const userObj = enrichUser({ ...meRes.value.usuario, isDemo: false });
        setUsuarioState(userObj);
        setModoDemo(false);
        if (meRes.value.usuario.temaPreferencia) {
          syncThemeFromUser(meRes.value.usuario.temaPreferencia);
        } else {
          api.getTema()
            .then((t) => {
              if (t && t.tema) syncThemeFromUser(t.tema);
            })
            .catch(() => {});
        }
      } else {
        setUsuarioState(null);
      }
    } catch (_) {
      setUsuarioState(null);
    } finally {
      setCarregandoSessao(false);
    }
  }, [enrichUser, syncThemeFromUser]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const loginComGoogleCredential = useCallback(
    async (credential) => {
      const data = await api.loginWithGoogle(credential);
      if (data?.usuario) {
        const enriched = enrichUser({ ...data.usuario, isDemo: false });
        setUsuarioState(enriched);
        setModoDemo(false);
        if (data.usuario.temaPreferencia) {
          syncThemeFromUser(data.usuario.temaPreferencia);
        }
        return enriched;
      }
      throw new Error('Falha ao autenticar usuário.');
    },
    [enrichUser, syncThemeFromUser]
  );

  const entrarModoDemonstracao = useCallback(() => {
    setModoDemo(true);
    setUsuarioState(enrichUser({ ...DEMO_USER_PROFILE, isDemo: true }));
  }, [enrichUser]);

  const atualizarUsuarioLocal = useCallback(
    (novosDados) => {
      setUsuarioState((prev) => {
        const base = prev || DEMO_USER_PROFILE;
        return enrichUser({ ...base, ...novosDados });
      });
    },
    [enrichUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_) {}
    setModoDemo(false);
    setUsuarioState(null);
  }, []);

  const perfilAtivo = usuario || (modoDemo ? enrichUser(DEMO_USER_PROFILE) : null);

  return (
    <AuthContext.Provider
      value={{
        usuario: perfilAtivo,
        usuarioReal: usuario && !usuario.isDemo ? usuario : null,
        ssoConfig,
        carregandoSessao,
        modoDemo,
        loginComGoogleCredential,
        entrarModoDemonstracao,
        atualizarUsuarioLocal,
        refreshAuth,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
