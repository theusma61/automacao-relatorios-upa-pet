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
  if (!trimmed) return 'Doutor(a)';
  const parts = trimmed.split(/\s+/);
  if (/^Dra?\.?$/i.test(parts[0]) && parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

export function AuthProvider({ children }) {
  const { syncThemeFromUser } = useTheme();
  const [usuario, setUsuarioState] = useState(null);
  const [ssoConfig, setSsoConfig] = useState({ googleClientId: '', ssoAtivo: false });
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  const enrichUser = useCallback((u) => {
    if (!u) return null;
    const nome = u.nome || u.name || 'Veterinário(a)';
    return {
      ...u,
      nome,
      name: nome,
      greetingName: computeGreetingName(nome),
      initials: computeInitials(nome),
      crmv: u.crmv || 'CRMV não informado',
      nomeClinica: u.nomeClinica || u.clinicName || 'Vetaro',
      clinicName: u.nomeClinica || u.clinicName || 'Vetaro',
      specialty: u.specialty || 'Diagnóstico por Imagem & Cirurgia Veterinária',
      autoMeasurements: u.autoMeasurements !== undefined ? u.autoMeasurements : true,
      voiceDictation: u.voiceDictation !== undefined ? u.voiceDictation : true,
      includeHeaderLogo: u.includeHeaderLogo !== undefined ? u.includeHeaderLogo : true
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
        const userObj = enrichUser(meRes.value.usuario);
        setUsuarioState(userObj);
        if (meRes.value.usuario.temaPreferencia) {
          syncThemeFromUser(meRes.value.usuario.temaPreferencia);
        } else {
          api
            .getTema()
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
        const enriched = enrichUser(data.usuario);
        setUsuarioState(enriched);
        if (data.usuario.temaPreferencia) {
          syncThemeFromUser(data.usuario.temaPreferencia);
        }
        return enriched;
      }
      throw new Error('Falha ao autenticar usuário.');
    },
    [enrichUser, syncThemeFromUser]
  );

  const atualizarUsuarioLocal = useCallback(
    (novosDados) => {
      setUsuarioState((prev) => {
        if (!prev) return null;
        return enrichUser({ ...prev, ...novosDados });
      });
    },
    [enrichUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_) {}
    setUsuarioState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        ssoConfig,
        carregandoSessao,
        loginComGoogleCredential,
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
