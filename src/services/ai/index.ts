import { Platform } from 'react-native';
import { chatWithOpenAI, streamChatWithOpenAI, OpenAIMessage } from './providers/openai';
import { chatWithGemini, streamChatWithGemini, GeminiMessage } from './providers/gemini';
import { chatWithPerplexity, streamChatWithPerplexity, PerplexityMessage, WebSource } from './providers/perplexity';
import { AIProvider, AI_CONFIG } from './config';

// Re-export secure chat for production use
export { secureChatStream, secureChat } from './secure-chat';
export type { ChatMessage as SecureChatMessage, SecureChatResponse } from './secure-chat';

// Re-export WebSource type
export type { WebSource } from './providers/perplexity';

// Check if streaming is supported (not available on React Native due to missing pipeThrough)
const isStreamingSupported = Platform.OS === 'web';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIResponse = {
  content: string;
  model: string;
  provider: AIProvider;
  citations?: WebSource[];
};

export type ChatOptions = {
  model?: string;
  deepThinking?: boolean;
};

// Convert messages to provider-specific format
function toOpenAIMessages(messages: ChatMessage[]): OpenAIMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

function toPerplexityMessages(messages: ChatMessage[]): PerplexityMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

function toGeminiMessages(messages: ChatMessage[]): { messages: GeminiMessage[]; systemPrompt?: string } {
  const systemMessage = messages.find((m) => m.role === 'system');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      content: msg.content,
    }));

  return {
    messages: chatMessages,
    systemPrompt: systemMessage?.content,
  };
}

export async function chat(
  messages: ChatMessage[],
  provider: AIProvider = 'gemini',
  options?: ChatOptions
): Promise<AIResponse> {
  try {
    let content: string;
    let model: string;
    let citations: WebSource[] | undefined;

    if (provider === 'openai') {
      model = options?.model || AI_CONFIG.openai.defaultModel;
      content = await chatWithOpenAI(toOpenAIMessages(messages), model, options?.deepThinking);
    } else if (provider === 'perplexity') {
      model = options?.model || AI_CONFIG.perplexity.defaultModel;
      const response = await chatWithPerplexity(toPerplexityMessages(messages), model, options?.deepThinking);
      content = response.content;
      citations = response.citations;
    } else {
      model = options?.model || AI_CONFIG.gemini.defaultModel;
      const { messages: geminiMessages, systemPrompt } = toGeminiMessages(messages);
      content = await chatWithGemini(geminiMessages, systemPrompt, model, options?.deepThinking);
    }

    return { content, model, provider, citations };
  } catch (error) {
    console.error(`AI chat error (${provider}):`, error);
    throw error;
  }
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  provider: AIProvider = 'gemini',
  options?: ChatOptions
): Promise<AIResponse> {
  // On native platforms, fall back to non-streaming since pipeThrough is not available
  if (!isStreamingSupported) {
    const response = await chat(messages, provider, options);
    // Simulate streaming by sending the full response at once
    onChunk(response.content);
    return response;
  }

  try {
    let content: string;
    let model: string;
    let citations: WebSource[] | undefined;

    if (provider === 'openai') {
      // When deep thinking is enabled, use pro model; otherwise use provided model or default
      const defaultModel = options?.deepThinking ? AI_CONFIG.openai.deepThinkingModel : AI_CONFIG.openai.defaultModel;
      model = options?.model || defaultModel;
      content = await streamChatWithOpenAI(toOpenAIMessages(messages), onChunk, model, options?.deepThinking);
      // Return the actual model used (pro model if deep thinking)
      model = options?.deepThinking ? AI_CONFIG.openai.deepThinkingModel : model;
    } else if (provider === 'perplexity') {
      const defaultModel = options?.deepThinking ? AI_CONFIG.perplexity.deepThinkingModel : AI_CONFIG.perplexity.defaultModel;
      model = options?.model || defaultModel;
      const response = await streamChatWithPerplexity(toPerplexityMessages(messages), onChunk, model, options?.deepThinking);
      content = response.content;
      citations = response.citations;
      // Return the actual model used (pro model if deep thinking)
      model = options?.deepThinking ? AI_CONFIG.perplexity.deepThinkingModel : model;
    } else {
      // When deep thinking is enabled, use pro model; otherwise use provided model or default
      const defaultModel = options?.deepThinking ? AI_CONFIG.gemini.deepThinkingModel : AI_CONFIG.gemini.defaultModel;
      model = options?.model || defaultModel;
      const { messages: geminiMessages, systemPrompt } = toGeminiMessages(messages);
      content = await streamChatWithGemini(geminiMessages, onChunk, systemPrompt, model, options?.deepThinking);
      // Return the actual model used (pro model if deep thinking)
      model = options?.deepThinking ? AI_CONFIG.gemini.deepThinkingModel : model;
    }

    return { content, model, provider, citations };
  } catch (error) {
    console.error(`AI stream error (${provider}):`, error);
    throw error;
  }
}

export { AI_CONFIG, type AIProvider } from './config';

