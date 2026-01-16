// AI Provider Configuration
// API keys are loaded from environment variables (EXPO_PUBLIC_*)
// Note: Perplexity API key is stored server-side in Supabase secrets

export const AI_CONFIG = {
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    defaultModel: 'gpt-4o-mini',
    deepThinkingModel: process.env.EXPO_PUBLIC_OPENAI_PRO_MODEL || 'gpt-4o',
    deepThinking: {
      temperature: 0.2,
      maxTokens: 4096,
    },
  },
  gemini: {
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    defaultModel: 'gemini-2.0-flash',
    deepThinkingModel: process.env.EXPO_PUBLIC_GEMINI_PRO_MODEL || 'gemini-1.5-pro',
    deepThinking: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  },
  perplexity: {
    // API key is stored in Supabase secrets (PERPLEXITY_API_KEY)
    // Calls go through Edge Function for security
    defaultModel: 'sonar',
    deepThinkingModel: 'sonar-pro',
  },
} as const;

export type AIProvider = 'openai' | 'gemini' | 'perplexity';

