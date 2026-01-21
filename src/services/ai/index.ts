export { secureChatStream, secureChat } from './secure-chat';
export type { ChatMessage, SecureChatResponse } from './secure-chat';

// Re-export ChatMessage for compatibility
export type { ChatMessage as ChatMessageType } from './secure-chat';

// Placeholder types for compatibility (if needed by UI)
export type AI_CONFIG = {
  provider?: 'openai' | 'gemini';
  deepThinking?: boolean;
};

export type WebSource = {
  title: string;
  url: string;
  snippet?: string;
};
