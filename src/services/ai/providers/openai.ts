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
  model: string = AI_CONFIG.openai.defaultModel
): Promise<string> {
  const client = getClient();
  
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'No response generated.';
}

export async function streamChatWithOpenAI(
  messages: OpenAIMessage[],
  onChunk: (chunk: string) => void,
  model: string = AI_CONFIG.openai.defaultModel
): Promise<string> {
  const client = getClient();
  
  const stream = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
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
}

