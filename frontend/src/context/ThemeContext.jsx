import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const ThemeContext = createContext(null);

function resolveIsDark(pref) {
  if (pref === 'light') return false;
  if (pref === 'dark') return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

export function ThemeProvider({ children }) {
  const [temaPreferencia, setTemaPreferencia] = useState(() => {
    try {
      return localStorage.getItem('tema_preferencia') || 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  const [darkMode, setDarkModeState] = useState(() => resolveIsDark(temaPreferencia));

  const applyThemeToDOM = useCallback((isDark, prefString) => {
    setDarkModeState(isDark);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
    try {
      localStorage.setItem('tema_preferencia', prefString);
    } catch (_) {}
  }, []);

  useEffect(() => {
    applyThemeToDOM(resolveIsDark(temaPreferencia), temaPreferencia);
  }, [temaPreferencia, applyThemeToDOM]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      try {
        const saved = localStorage.getItem('tema_preferencia');
        if (saved === 'system') {
          applyThemeToDOM(mq.matches, 'system');
        }
      } catch (_) {}
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [applyThemeToDOM]);

  const setDarkMode = useCallback(
    (nextDark, syncBackend = true) => {
      const resolvedBool = typeof nextDark === 'function' ? nextDark(darkMode) : Boolean(nextDark);
      const nextPref = resolvedBool ? 'dark' : 'light';
      setTemaPreferencia(nextPref);
      applyThemeToDOM(resolvedBool, nextPref);
      if (syncBackend) {
        api.saveTema(nextPref).catch(() => {});
      }
    },
    [darkMode, applyThemeToDOM]
  );

  const setTema = useCallback(
    (pref, syncBackend = true) => {
      const validPref = ['dark', 'light', 'system'].includes(pref) ? pref : 'dark';
      const isDark = resolveIsDark(validPref);
      setTemaPreferencia(validPref);
      applyThemeToDOM(isDark, validPref);
      if (syncBackend) {
        api.saveTema(validPref).catch(() => {});
      }
    },
    [applyThemeToDOM]
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode, true);
  }, [darkMode, setDarkMode]);

  const syncThemeFromUser = useCallback(
    (userTema) => {
      if (!userTema) return;
      const validPref = ['dark', 'light', 'system'].includes(userTema) ? userTema : 'dark';
      setTemaPreferencia(validPref);
      applyThemeToDOM(resolveIsDark(validPref), validPref);
    },
    [applyThemeToDOM]
  );

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        temaPreferencia,
        setDarkMode,
        setTema,
        toggleDarkMode,
        syncThemeFromUser
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
