import React, { createContext, useContext, useMemo } from 'react';
import { en, TranslationKeys } from './translations/en';
import { de } from './translations/de';
import { es } from './translations/es';
import { usePreferences } from '@/services/preferences';

export type Language = 'en' | 'de' | 'es';

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

const translations: Record<Language, TranslationKeys> = {
  en,
  de,
  es,
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = usePreferences();

  const value = useMemo<I18nContextType>(() => ({
    language,
    setLanguage,
    t: translations[language],
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

// Re-export types
export type { TranslationKeys };

