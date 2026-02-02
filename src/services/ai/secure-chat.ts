import { supabase } from '@/services/supabase';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type SecureChatResponse = {
  content: string;
  model: string;
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude';
  citations?: string[]; // Citation URLs from Perplexity
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
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude',
  deepThinking?: boolean,
  image?: { mimeType: string; base64: string },
  taskCategory?: string,
  webSearch?: boolean,
  onThinking?: (thinkingStatus: string | null) => void
): Promise<SecureChatResponse> {
  // Get fresh session (getUser refreshes token if needed)
  const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

  if (userError || !currentUser) {
    console.error('[SecureChat] Auth error:', userError);
    throw new Error('Not authenticated. Please sign in.');
  }

  // Get session
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    console.error('[SecureChat] Session error:', sessionError);
    // Try to refresh
    const refresh = await supabase.auth.refreshSession();
    session = refresh.data.session;

    if (!session?.access_token) {
      throw new Error('Failed to get session. Please try signing in again.');
    }
  }

  // Check if token is expired or about to expire (within 60 seconds)
  try {
    const parts = session.access_token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;

      console.log(`[SecureChat] Token expires in ${timeUntilExpiry}s`);

      if (timeUntilExpiry < 60) {
        console.log('[SecureChat] Token expiring soon, refreshing...');
        const refresh = await supabase.auth.refreshSession();
        if (refresh.data.session) {
          session = refresh.data.session;
          console.log('[SecureChat] Token refreshed successfully');
        }
      }
    }
  } catch (e) {
    console.warn('[SecureChat] Failed to check token expiry:', e);
  }

  console.log('[SecureChat] Using access token (first 20 chars):', session.access_token.substring(0, 20) + '...');

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
  if (deepThinking !== undefined) requestBody.deepThinking = deepThinking;
  if (image) requestBody.image = image;
  if (taskCategory) requestBody.taskCategory = taskCategory;
  if (webSearch !== undefined) requestBody.webSearch = webSearch;
  if (provider) requestBody.provider = provider;

  // Dev/Prod Separation:
  // - Localhost (__DEV__): Uses 'chat-dev' for safe testing
  // - Production: Uses 'chat' (stable)
  const functionName = __DEV__ ? 'chat-dev' : 'chat';

  console.log('[SecureChat] Sending request to Edge Function:', {
    url: `${supabaseUrl}/functions/v1/${functionName}`,
    hasToken: !!session.access_token,
    tokenLength: session.access_token?.length,
    mascotId,
    conversationId,
    hasImage: !!image,
  });

  // Debug: Decode token to check issuer
  try {
    if (session.access_token) {
      const parts = session.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('[SecureChat] Token Claims:', {
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          sub: payload.sub,
        });

        const expectedUrl = supabaseUrl;
        const expectedHost = expectedUrl.replace('https://', '').split('.')[0];
        if (payload.iss && !payload.iss.includes(expectedHost)) {
          console.error('[SecureChat] CRITICAL: Token issuer does not match current project URL!', {
            tokenIss: payload.iss,
            expectedHost: expectedUrl,
            expectedProjectRef: expectedHost
          });
        }
      }
    }
  } catch (e) {
    console.warn('[SecureChat] Failed to decode token for debugging', e);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      // PROXY BYPASS: Send Anon Key in Auth header to satisfy Gateway verification
      // The Gateway will validate this (it's valid) and let the request through.
      'Authorization': `Bearer ${supabaseAnonKey}`,
      // Pass the actual User Token in a custom header for the Function to validate
      'x-user-token': session.access_token,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SecureChat] Request failed:', {
      status: response.status,
      statusText: response.statusText,
      errorText: errorText.substring(0, 500), // Log first 500 chars
    });

    let errorMessage = 'Chat request failed';
    let errorDetails = '';

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
      errorDetails = errorJson.details || errorJson.message || '';
      if (errorJson.hint) errorDetails += ` (Hint: ${errorJson.hint})`;
    } catch {
      errorMessage = errorText || errorMessage;
    }

    if (response.status === 401) {
      throw new Error(`Authentication failed (401): ${errorMessage}. Details: ${errorDetails || 'See server logs'}`);
    }

    throw new Error(`Chat error (${response.status}): ${errorMessage}. ${errorDetails}`);
  }

  // Handle SSE stream
  // Handle SSE stream
  const reader = response.body?.getReader();

  // Fallback for environments without streaming support (e.g. standard React Native without polyfills)
  if (!reader) {
    console.warn('[SecureChat] No response body stream available, falling back to buffered text');
    try {
      const text = await response.text();
      const lines = text.split('\n').filter((line) => line.startsWith('data: '));
      let fullContent = '';
      let model = '';
      let actualProvider: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude' | undefined = undefined;
      let citations: string[] | undefined = undefined;

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.done) {
            model = data.model || 'unknown';
            actualProvider = data.provider || undefined;
          } else if (data.content) {
            fullContent += data.content;
            onChunk(data.content);
          } else if (data.thinking) {
            // Show thinking status in UI (transient indicator)
            if (onThinking) {
              onThinking(data.thinking);
            }
          } else if (data.citations) {
            citations = data.citations;
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e; // Re-throw actual errors
        }
      }
      return { content: fullContent, model, provider: actualProvider, citations };
    } catch (e: any) {
      console.error('[SecureChat] Fallback failed:', e);
      throw new Error(`No response body and fallback failed: ${e.message}`);
    }
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let model = '';
  let actualProvider: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude' | undefined = undefined;
  let citations: string[] | undefined = undefined;

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
        } else if (data.thinking) {
          // Show thinking status in UI (transient indicator)
          if (onThinking) {
            onThinking(data.thinking);
          }
        } else if (data.citations) {
          citations = data.citations;
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return { content: fullContent, model, provider: actualProvider, citations };
}

/**
 * Non-streaming version
 */
export async function secureChat(
  mascotId: string,
  messages: ChatMessage[],
  conversationId?: string,
  skillId?: string,
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude',
  deepThinking?: boolean,
  image?: { mimeType: string; base64: string },
  taskCategory?: string
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
    deepThinking,
    image,
    taskCategory
  );

  return response;
}

