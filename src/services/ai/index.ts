export { secureChatStream, secureChat } from './secure-chat';
export type { ChatMessage, SecureChatResponse } from './secure-chat';

// SecureChatMessage excludes 'system' role (for Edge Function)
export type SecureChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Types for compatibility
export type AI_CONFIG = {
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok';
  deepThinking?: boolean;
};

export type WebSource = {
  title: string;
  url: string;
  snippet?: string;
};
