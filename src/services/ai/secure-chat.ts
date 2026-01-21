import { supabase } from '@/services/supabase';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type SecureChatResponse = {
  content: string;
  model: string;
  provider?: 'openai' | 'gemini';
};

/**
 * Streams a chat response from the secure Edge Function
 */
export async function secureChatStream(
  mascotId: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  conversationId?: string,
  skillId?: string,
  provider?: 'openai' | 'gemini',
  deepThinking?: boolean
): Promise<SecureChatResponse> {
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    throw new Error('Not authenticated. Please sign in.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing.');
  }

  const requestBody: any = {
    mascotId,
    messages,
  };
  
  if (conversationId) requestBody.conversationId = conversationId;
  if (skillId) requestBody.skillId = skillId;
  if (provider) requestBody.provider = provider;
  if (deepThinking !== undefined) requestBody.deepThinking = deepThinking;

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Chat request failed';
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    
    throw new Error(errorMessage);
  }

  // Handle SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let model = '';
  let actualProvider: 'openai' | 'gemini' | undefined = undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6));
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.done) {
          model = data.model || 'unknown';
          actualProvider = data.provider || undefined;
        } else if (data.content) {
          fullContent += data.content;
          onChunk(data.content);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return { content: fullContent, model, provider: actualProvider };
}

/**
 * Non-streaming version
 */
export async function secureChat(
  mascotId: string,
  messages: ChatMessage[],
  conversationId?: string,
  skillId?: string,
  provider?: 'openai' | 'gemini',
  deepThinking?: boolean
): Promise<SecureChatResponse> {
  let fullContent = '';

  const response = await secureChatStream(
    mascotId,
    messages,
    (chunk) => {
      fullContent += chunk;
    },
    conversationId,
    skillId,
    provider,
    deepThinking
  );

  return response;
}
