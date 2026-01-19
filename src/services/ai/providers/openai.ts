import OpenAI from 'openai';
import { AI_CONFIG } from '../config';

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
      dangerouslyAllowBrowser: true, // For client-side usage in Expo
    });
  }
  return openaiClient;
}

export type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function chatWithOpenAI(
  messages: OpenAIMessage[],
  model: string = AI_CONFIG.openai.defaultModel,
  deepThinking: boolean = false
): Promise<string> {
  if (!AI_CONFIG.openai.apiKey) {
    throw new Error('OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables.');
  }

  const client = getClient();
  const deepConfig = deepThinking ? AI_CONFIG.openai.deepThinking : undefined;
  // Use pro model when deep thinking is enabled
  const effectiveModel = deepThinking ? AI_CONFIG.openai.deepThinkingModel : model;
  
  try {
    const response = await client.chat.completions.create({
      model: effectiveModel,
      messages,
      max_tokens: deepConfig?.maxTokens ?? 2048,
      temperature: deepConfig?.temperature ?? 0.7,
    });

    return response.choices[0]?.message?.content || 'No response generated.';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    if (error?.status === 401) {
      throw new Error('OpenAI API key is invalid. Please check your EXPO_PUBLIC_OPENAI_API_KEY.');
    }
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      throw new Error('Connection error: Unable to reach OpenAI API. Please check your internet connection.');
    }
    throw new Error(error?.message || 'OpenAI API request failed');
  }
}

export async function streamChatWithOpenAI(
  messages: OpenAIMessage[],
  onChunk: (chunk: string) => void,
  model: string = AI_CONFIG.openai.defaultModel,
  deepThinking: boolean = false
): Promise<string> {
  if (!AI_CONFIG.openai.apiKey) {
    throw new Error('OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables.');
  }

  const client = getClient();
  const deepConfig = deepThinking ? AI_CONFIG.openai.deepThinking : undefined;
  // Use pro model when deep thinking is enabled
  const effectiveModel = deepThinking ? AI_CONFIG.openai.deepThinkingModel : model;
  
  try {
    const stream = await client.chat.completions.create({
      model: effectiveModel,
      messages,
      max_tokens: deepConfig?.maxTokens ?? 2048,
      temperature: deepConfig?.temperature ?? 0.7,
      stream: true,
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }

    return fullResponse;
  } catch (error: any) {
    console.error('OpenAI streaming error:', error);
    if (error?.status === 401) {
      throw new Error('OpenAI API key is invalid. Please check your EXPO_PUBLIC_OPENAI_API_KEY.');
    }
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      throw new Error('Connection error: Unable to reach OpenAI API. Please check your internet connection.');
    }
    throw new Error(error?.message || 'OpenAI API request failed');
  }
}

