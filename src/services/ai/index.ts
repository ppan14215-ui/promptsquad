export { secureChatStream, secureChat } from './secure-chat';
export type { ChatMessage, SecureChatResponse } from './secure-chat';

// Re-export for compatibility
export type { ChatMessage as SecureChatMessage } from './secure-chat';

// Types for compatibility
export type AI_CONFIG = {
  provider?: 'openai' | 'gemini';
  deepThinking?: boolean;
};

export type WebSource = {
  title: string;
  url: string;
  snippet?: string;
};
