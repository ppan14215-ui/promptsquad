import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'de' | 'es';
export type LLMProvider = 'gemini' | 'openai' | 'perplexity' | 'grok';
export type LLMPreference = 'auto' | LLMProvider;

export const LLM_OPTIONS: { code: LLMPreference; name: string; description: string }[] = [
  { code: 'auto', name: 'Auto', description: 'Best model for the task' },
  { code: 'gemini', name: 'Google Gemini', description: 'Fast & efficient' },
  { code: 'openai', name: 'OpenAI GPT', description: 'Most capable' },
  { code: 'perplexity', name: 'Perplexity', description: 'Web-grounded answers' },
  { code: 'grok', name: 'Grok 2', description: 'Fun & Uncensored' },
];

// Task categories that help determine which AI is best
export type TaskCategory =
  | 'analysis'      // Data analysis, research - OpenAI excels
  | 'creative'      // Writing, content creation - OpenAI excels
  | 'coding'        // Code generation, debugging - OpenAI excels
  | 'conversation'  // General chat, advice - Gemini is fast & good
  | 'ux'            // Design, UX work - OpenAI for nuance
  | 'quick'         // Fast responses needed - Gemini
  | 'complex';      // Complex reasoning - OpenAI

// Logic to select the best AI provider based on task category
export function selectBestProvider(
  preference: LLMPreference,
  taskCategory?: TaskCategory
): LLMProvider {
  // If user has a specific preference (not auto), use it
  if (preference !== 'auto') {
    return preference;
  }

  // Auto mode: select based on task category
  switch (taskCategory) {
    case 'analysis':
    case 'creative':
    case 'coding':
    case 'ux':
    case 'complex':
      // OpenAI excels at complex reasoning, creativity, and code
      return 'openai';
    case 'conversation':
    case 'quick':
      // Gemini is faster and great for general conversation
      return 'gemini';
    default:
      // Default to Gemini for speed
      return 'gemini';
  }
}

type PreferencesContextType = {
  theme: ThemeMode;
  language: Language;
  preferredLLM: LLMPreference;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setPreferredLLM: (llm: LLMPreference) => void;
  isLoading: boolean;
};

type ProfileRow = {
  theme?: string | null;
  language?: string | null;
  preferred_llm?: string | null;
};

type ProfileRowBasic = {
  theme?: string | null;
  language?: string | null;
};

type ProfileRowLLM = {
  preferred_llm?: string | null;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEYS = {
  theme: 'user_theme',
  language: 'user_language',
  preferredLLM: 'user_preferred_llm',
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [language, setLanguageState] = useState<Language>('en');
  const [preferredLLM, setPreferredLLMState] = useState<LLMPreference>('auto');
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
        // Use a safe query that handles missing columns gracefully
        const profileResult = await supabase
          .from('profiles')
          .select('theme, language')
          .eq('id', user.id)
          .maybeSingle();

        const profile = profileResult.data as ProfileRowBasic | null;
        const profileError = profileResult.error;

        // Skip preferred_llm query for now - column doesn't exist yet
        // TODO: Uncomment after running migration 002_add_preferred_llm.sql
        let preferredLLM: LLMPreference = 'auto';

        if (profileError) {
          console.error('Error loading profile:', profileError);
          // Fall through to local storage
        } else if (profile) {
          setThemeState((profile.theme as ThemeMode) || 'light');
          setLanguageState((profile.language as Language) || 'en');
          setPreferredLLMState(preferredLLM);
          // Also save to local storage for faster loading next time
          await AsyncStorage.setItem(STORAGE_KEYS.theme, profile.theme || 'light');
          await AsyncStorage.setItem(STORAGE_KEYS.language, profile.language || 'en');
          await AsyncStorage.setItem(STORAGE_KEYS.preferredLLM, preferredLLM);
        } else {
          // No profile found, try loading from local storage
          const [storedTheme, storedLanguage, storedLLM] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.theme),
            AsyncStorage.getItem(STORAGE_KEYS.language),
            AsyncStorage.getItem(STORAGE_KEYS.preferredLLM),
          ]);
          if (storedTheme) setThemeState(storedTheme as ThemeMode);
          if (storedLanguage) setLanguageState(storedLanguage as Language);
          if (storedLLM) setPreferredLLMState(storedLLM as LLMPreference);
        }
      } else {
        // For non-authenticated users (login screen), always use light mode
        // Language and LLM can still be loaded from local storage
        setThemeState('light');
        const [storedLanguage, storedLLM] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.preferredLLM),
        ]);
        if (storedLanguage) setLanguageState(storedLanguage as Language);
        if (storedLLM) setPreferredLLMState(storedLLM as LLMPreference);
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

  const setPreferredLLM = useCallback(async (newLLM: LLMPreference) => {
    setPreferredLLMState(newLLM);

    // Save to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.preferredLLM, newLLM);

    // Save to Supabase if user is logged in
    if (user) {
      await (supabase
        .from('profiles') as any)
        .update({ preferred_llm: newLLM, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }, [user]);

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        language,
        preferredLLM,
        setTheme,
        setLanguage,
        setPreferredLLM,
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

