import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'de' | 'es';

type PreferencesContextType = {
  theme: ThemeMode;
  language: Language;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
};

type ProfileRow = {
  theme: string | null;
  language: string | null;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEYS = {
  theme: 'user_theme',
  language: 'user_language',
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount and when user changes
  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Try to load from Supabase profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme, language')
          .eq('id', user.id)
          .single() as { data: ProfileRow | null };

        if (profile) {
          setThemeState((profile.theme as ThemeMode) || 'light');
          setLanguageState((profile.language as Language) || 'en');
          // Also save to local storage for faster loading next time
          await AsyncStorage.setItem(STORAGE_KEYS.theme, profile.theme || 'light');
          await AsyncStorage.setItem(STORAGE_KEYS.language, profile.language || 'en');
        }
      } else {
        // For non-authenticated users (login screen), always use light mode
        // Language can still be loaded from local storage
        setThemeState('light');
        const storedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.language);
        if (storedLanguage) setLanguageState(storedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    
    // Save to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.theme, newTheme);

    // Save to Supabase if user is logged in
    if (user) {
      await (supabase
        .from('profiles') as any)
        .update({ theme: newTheme, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }, [user]);

  const setLanguage = useCallback(async (newLanguage: Language) => {
    setLanguageState(newLanguage);
    
    // Save to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.language, newLanguage);

    // Save to Supabase if user is logged in
    if (user) {
      await (supabase
        .from('profiles') as any)
        .update({ language: newLanguage, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }, [user]);

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        language,
        setTheme,
        setLanguage,
        isLoading,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}

