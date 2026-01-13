import React, { createContext, useContext, useMemo } from 'react';
import { lightColors } from './tokens/light';
import { darkColors } from './tokens/dark';
import { usePreferences } from '@/services/preferences';

type ThemeMode = 'light' | 'dark';

type Theme = {
  mode: ThemeMode;
  colors: typeof lightColors;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme: mode, setTheme: setMode } = usePreferences();

  const value = useMemo<Theme>(() => {
    const colors = mode === 'dark' ? darkColors : lightColors;
    return {
      mode,
      colors,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
      setMode,
    };
  }, [mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

