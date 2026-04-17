import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';

/*
 * Edge Function SSE protocol (supabase/functions/chat)
 * -----------------------------------------------------
 * Each event is a single `data: {...}` line terminated by `\n\n`.
 * The client understands the following event shapes:
 *
 *   { content: "chunk" }         Answer tokens. Concatenate on client.
 *   { reasoning: "chunk" }       Chain-of-thought tokens. Accumulate and
 *                                render in the collapsible ReasoningTrace
 *                                block. Only emit for providers that
 *                                actually produce a reasoning trace:
 *                                  Claude: set `thinking: { type: "enabled",
 *                                          budget_tokens: N }` on the
 *                                          Anthropic request and forward
 *                                          every `thinking_delta` as a
 *                                          `reasoning` event.
 *                                  OpenAI o-series: use the Responses API
 *                                          with `reasoning: { effort: "medium" }`
 *                                          and forward reasoning summary
 *                                          deltas.
 *                                  Gemini/Grok/Perplexity: skip unless
 *                                          they expose one.
 *   { reasoningDone: true,       Emit when the model transitions from
 *     reasoningSeconds: 12 }     reasoning → answer. `reasoningSeconds` is
 *                                optional; client uses it to render
 *                                "Thought for 12s". If omitted, the client
 *                                uses its own wall-clock timer.
 *   { thinking: "Searching…" }   Short transient status label (existing).
 *                                For things the user should see at a
 *                                glance while waiting. Not persisted.
 *   { citations: [url, url] }    Perplexity source URLs.
 *   { done: true, model, provider } End of stream.
 *   { error: "..." }             Terminal failure.
 *
 * Ordering expectation:
 *   reasoning* → reasoningDone → content* → done
 *   thinking events can appear anywhere before `done`.
 */

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type SecureChatResponse = {
  content: string;
  model: string;
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude';
  citations?: string[]; // Citation URLs from Perplexity
  downgradedFrom?: string; // Original model if downgraded
  /**
   * Full reasoning / chain-of-thought trace, concatenated from all
   * `data.reasoning` SSE events. Populated when the backend enables extended
   * thinking (Claude `thinking: enabled`, OpenAI o-series, etc.) and streams
   * the trace back. Empty / undefined otherwise.
   */
  reasoning?: string;
  /** Wall-clock seconds spent in the reasoning phase, if the backend reported it. */
  reasoningSeconds?: number;
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
  onThinking?: (thinkingStatus: string | null) => void,
  onDowngrade?: (originalModel: string) => void,
  /**
   * Called for every `data.reasoning` SSE event. Each chunk is appended —
   * callers are expected to accumulate them. Only fires when the backend has
   * extended thinking enabled for the selected model.
   */
  onReasoningChunk?: (chunk: string) => void,
  /**
   * Called once the reasoning phase ends and the model starts emitting the
   * final answer. Receives the total wall-clock seconds spent thinking (if
   * the backend supplied it via `data.reasoningSeconds`, otherwise undefined).
   */
  onReasoningDone?: (seconds?: number) => void,
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

  // `chat-dev` is optional and must be deployed separately. Expo web runs with __DEV__ but always
  // calls the remote Supabase URL — only `chat` exists there, so web would 404 on chat-dev.
  const functionName =
    __DEV__ && Platform.OS !== 'web' ? 'chat-dev' : 'chat';

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

  // Fresh access token before Edge Function (web often had stale/expired session → 401).
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.data.session?.access_token) {
    session = refreshed.data.session;
  }
  if (!session?.access_token) {
    throw new Error('Session expired. Please sign in again.');
  }

  // Gateway validates Authorization as the anon key (user JWT there → "Invalid JWT").
  // Web: avoid custom header CORS by sending the session in JSON as _authAccessToken (Edge strips it).
  // Native: x-user-token header + anon Bearer (unchanged).
  const isWeb = Platform.OS === 'web';
  const bodyWithAuth = {
    ...requestBody,
    _authAccessToken: session.access_token,
  };
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      ...(!isWeb ? { 'x-user-token': session.access_token } : {}),
    },
    body: JSON.stringify(bodyWithAuth),
  });

  // Check for downgrade header
  const downgradedFrom = response.headers.get('x-model-downgraded-from');
  if (downgradedFrom && onDowngrade) {
    onDowngrade(downgradedFrom);
  }

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
      let fullReasoning = '';
      let reasoningSeconds: number | undefined = undefined;

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
          } else if (data.reasoning) {
            // Chain-of-thought chunk. Accumulate + forward to caller.
            fullReasoning += data.reasoning;
            if (onReasoningChunk) onReasoningChunk(data.reasoning);
          } else if (data.reasoningDone) {
            if (typeof data.reasoningSeconds === 'number') {
              reasoningSeconds = data.reasoningSeconds;
            }
            if (onReasoningDone) onReasoningDone(reasoningSeconds);
          } else if (data.thinking) {
            // Short transient status label (existing behavior).
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
      return {
        content: fullContent,
        model,
        provider: actualProvider,
        citations,
        downgradedFrom: downgradedFrom || undefined,
        reasoning: fullReasoning || undefined,
        reasoningSeconds,
      };
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
  let fullReasoning = '';
  let reasoningSeconds: number | undefined = undefined;

  // Buffer incomplete SSE events - chunks can be split across network packets
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    sseBuffer += chunk;

    // SSE events are delimited by double newline; process only complete events
    const events = sseBuffer.split('\n\n');
    sseBuffer = events.pop() || '';

    for (const event of events) {
      const line = event.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;

      try {
        const data = JSON.parse(line.slice(6).trim());

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.done) {
          model = data.model || 'unknown';
          actualProvider = data.provider || undefined;
        } else if (data.content) {
          fullContent += data.content;
          onChunk(data.content);
        } else if (data.reasoning) {
          fullReasoning += data.reasoning;
          if (onReasoningChunk) onReasoningChunk(data.reasoning);
        } else if (data.reasoningDone) {
          if (typeof data.reasoningSeconds === 'number') {
            reasoningSeconds = data.reasoningSeconds;
          }
          if (onReasoningDone) onReasoningDone(reasoningSeconds);
        } else if (data.thinking) {
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

  // Process any remaining buffer
  if (sseBuffer.trim()) {
    const line = sseBuffer.split('\n').find((l) => l.startsWith('data: '));
    if (line) {
      try {
        const data = JSON.parse(line.slice(6).trim());
        if (data.error) throw new Error(data.error);
        if (data.done) {
          model = data.model || 'unknown';
          actualProvider = data.provider || undefined;
        } else if (data.content) {
          fullContent += data.content;
          onChunk(data.content);
        } else if (data.reasoning) {
          fullReasoning += data.reasoning;
          if (onReasoningChunk) onReasoningChunk(data.reasoning);
        } else if (data.reasoningDone) {
          if (typeof data.reasoningSeconds === 'number') {
            reasoningSeconds = data.reasoningSeconds;
          }
          if (onReasoningDone) onReasoningDone(reasoningSeconds);
        } else if (data.citations) {
          citations = data.citations;
        }
      } catch {
        // Skip invalid trailing data
      }
    }
  }

  return {
    content: fullContent,
    model,
    provider: actualProvider,
    citations,
    downgradedFrom: downgradedFrom || undefined,
    reasoning: fullReasoning || undefined,
    reasoningSeconds,
  };
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

