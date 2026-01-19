import { TranslationKeys } from './translations/en';
import { useI18n } from './index';

// Map mascot IDs to translation keys
const MASCOT_ID_TO_TRANSLATION_KEY: Record<string, keyof TranslationKeys['mascots']> = {
  '1': 'analystBear',
  '2': 'writerFox',
  '3': 'uxPanda',
  '4': 'adviceZebra',
  '5': 'teacherOwl',
  '6': 'promptTurtle',
  '7': 'dataBadger',
  '8': 'quickMouse',
  '9': 'creativePig',
  '10': 'codeCat',
  '11': 'strategyCamel',
  '12': 'marketingFrog',
  '13': 'productGiraffe',
  '14': 'supportLion',
  '15': 'mentorSeahorse',
  '16': 'projectCamel',
  '17': 'researchFrog',
  '18': 'agileGiraffe',
  '19': 'brandLion',
  '20': 'devSeahorse',
};

// Helper to get mascot translation key from ID
export function getMascotTranslationKey(mascotId: string | null): keyof TranslationKeys['mascots'] | null {
  if (!mascotId) return null;
  return MASCOT_ID_TO_TRANSLATION_KEY[mascotId] || null;
}

// Hook to get mascot translations
export function useMascotTranslation(mascotId: string | null) {
  const { t } = useI18n();
  const key = getMascotTranslationKey(mascotId);
  
  if (!key) {
    return {
      name: mascotId || 'Unknown',
      subtitle: '',
      questionPrompt: 'How can I help?',
      greeting: 'Hello! How can I help you?',
    };
  }
  
  return t.mascots[key];
}

// Helper to get language code for LLM prompts
export function getLanguageCode(language: 'en' | 'de' | 'es'): string {
  const languageMap: Record<'en' | 'de' | 'es', string> = {
    en: 'English',
    de: 'German',
    es: 'Spanish',
  };
  return languageMap[language] || 'English';
}
