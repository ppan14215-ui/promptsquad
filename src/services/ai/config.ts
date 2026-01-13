// AI Provider Configuration
// API keys are loaded from environment variables (EXPO_PUBLIC_*)

export const AI_CONFIG = {
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    defaultModel: 'gpt-4o-mini',
  },
  gemini: {
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    defaultModel: 'gemini-2.0-flash',
  },
} as const;

export type AIProvider = 'openai' | 'gemini';

