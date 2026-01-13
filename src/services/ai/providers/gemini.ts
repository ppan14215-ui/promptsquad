import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { AI_CONFIG } from '../config';

let geminiClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(AI_CONFIG.gemini.apiKey);
  }
  return geminiClient;
}

export type GeminiMessage = {
  role: 'user' | 'model';
  content: string;
};

// Convert our message format to Gemini's format
function toGeminiHistory(messages: GeminiMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
}

// Filter history to ensure it starts with a user message (Gemini requirement)
function filterValidHistory(messages: GeminiMessage[]): GeminiMessage[] {
  // Find the first user message index
  const firstUserIndex = messages.findIndex((msg) => msg.role === 'user');
  if (firstUserIndex === -1) return [];
  
  // Return messages starting from the first user message
  return messages.slice(firstUserIndex);
}

export async function chatWithGemini(
  messages: GeminiMessage[],
  systemPrompt?: string,
  model: string = AI_CONFIG.gemini.defaultModel
): Promise<string> {
  const client = getClient();
  const generativeModel = client.getGenerativeModel({ 
    model,
    systemInstruction: systemPrompt,
  });

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new Error('Last message must be from user');
  }

  // Create chat with history (excluding the last message), ensuring it starts with user
  const historyMessages = filterValidHistory(messages.slice(0, -1));
  const history = toGeminiHistory(historyMessages);
  const chat = generativeModel.startChat({ history });

  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response;
  
  return response.text();
}

export async function streamChatWithGemini(
  messages: GeminiMessage[],
  onChunk: (chunk: string) => void,
  systemPrompt?: string,
  model: string = AI_CONFIG.gemini.defaultModel
): Promise<string> {
  const client = getClient();
  const generativeModel = client.getGenerativeModel({ 
    model,
    systemInstruction: systemPrompt,
  });

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new Error('Last message must be from user');
  }

  // Create chat with history (excluding the last message), ensuring it starts with user
  const historyMessages = filterValidHistory(messages.slice(0, -1));
  const history = toGeminiHistory(historyMessages);
  const chat = generativeModel.startChat({ history });

  const result = await chat.sendMessageStream(lastMessage.content);
  
  let fullResponse = '';
  
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullResponse += text;
      onChunk(text);
    }
  }

  return fullResponse;
}

