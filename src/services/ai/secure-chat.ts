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
  provider?: 'openai' | 'gemini'; // Provider that was actually used
};

/**
 * Streams a chat response from the secure Edge Function
 * The Edge Function handles:
 * - User authentication
 * - Mascot access validation
 * - System prompt injection (hidden from client)
 * - Instructions and skill prompts (if provided)
 * - AI provider routing
 */
export async function secureChatStream(
  mascotId: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  conversationId?: string,
  skillId?: string,
  provider?: 'openai' | 'gemini', // Optional AI provider override
  deepThinking?: boolean // Optional Deep Thinking mode (uses pro models)
): Promise<SecureChatResponse> {
  // Get the current session for auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('[SecureChat] Session error:', sessionError);
    throw new Error('Failed to get session. Please try signing in again.');
  }
  
  if (!session || !session.access_token) {
    console.error('[SecureChat] No session or access token');
    throw new Error('Not authenticated. Please sign in.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SecureChat] Missing env vars:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
    throw new Error('Supabase URL or anon key not configured. Please check your environment variables.');
  }

  console.log('[SecureChat] Making request to:', `${supabaseUrl}/functions/v1/chat`);
  console.log('[SecureChat] Has access token:', !!session.access_token);
  console.log('[SecureChat] Has apikey:', !!supabaseAnonKey);
  console.log('[SecureChat] Provider override parameter:', provider, '(type:', typeof provider, ')');

  // Use fetch for streaming support
  // Explicitly include provider only if it's defined (not undefined or null)
  const requestBody: any = {
    mascotId,
    messages,
  };
  
  if (conversationId) {
    requestBody.conversationId = conversationId;
  }
  
  if (skillId) {
    requestBody.skillId = skillId;
  }
  
  if (provider && (provider === 'openai' || provider === 'gemini')) {
    requestBody.provider = provider;
    console.log('[SecureChat] Including provider in request:', provider);
  } else {
    console.log('[SecureChat] No provider override (system will choose)');
  }
  
  if (deepThinking !== undefined) {
    requestBody.deepThinking = deepThinking;
    console.log('[SecureChat] Deep Thinking mode:', deepThinking);
  }
  
  console.log('[SecureChat] Request body keys:', Object.keys(requestBody));
  console.log('[SecureChat] Request body provider value:', requestBody.provider || 'not included');
  
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
    let errorDetails = '';
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
      errorDetails = errorJson.details || '';
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    // Provide more helpful error messages
    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    } else if (response.status === 400) {
      throw new Error(`Invalid request: ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    } else if (response.status >= 500) {
      throw new Error('Server error. Please try again in a moment.');
    } else {
      throw new Error(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
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
          actualProvider = data.provider || undefined; // Get provider from Edge Function response
          console.log('[SecureChat] Stream complete - Model:', model, 'Provider:', actualProvider);
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

  return { content: fullContent, model, provider: actualProvider };
}

/**
 * Non-streaming version for simpler use cases
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
  let model = '';

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

