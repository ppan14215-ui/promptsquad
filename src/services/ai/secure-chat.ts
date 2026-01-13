// Secure chat service that calls the Supabase Edge Function
// This keeps API keys server-side and validates user access

import { supabase } from '@/services/supabase';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SecureChatResponse = {
  content: string;
  model: string;
};

/**
 * Streams a chat response from the secure Edge Function
 * The Edge Function handles:
 * - User authentication
 * - Mascot access validation
 * - System prompt injection (hidden from client)
 * - AI provider routing
 */
export async function secureChatStream(
  mascotId: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  conversationId?: string
): Promise<SecureChatResponse> {
  // Get the current session for auth
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated. Please sign in.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mascotId,
      messages,
      conversationId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Chat request failed');
  }

  // Handle SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let model = '';

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
        } else if (data.content) {
          fullContent += data.content;
          onChunk(data.content);
        }
      } catch (e) {
        // Skip invalid JSON lines
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return { content: fullContent, model };
}

/**
 * Non-streaming version for simpler use cases
 */
export async function secureChat(
  mascotId: string,
  messages: ChatMessage[],
  conversationId?: string
): Promise<SecureChatResponse> {
  let fullContent = '';
  let model = '';

  const response = await secureChatStream(
    mascotId,
    messages,
    (chunk) => {
      fullContent += chunk;
    },
    conversationId
  );

  return response;
}

