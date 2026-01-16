import { supabase } from '@/services/supabase';

export type PerplexityMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type WebSource = {
  title: string;
  url: string;
  snippet?: string;
};

export type PerplexityResponse = {
  content: string;
  citations: WebSource[];
};

/**
 * Calls the Perplexity Edge Function for secure API access
 * The Edge Function handles the API key server-side
 */
export async function chatWithPerplexity(
  messages: PerplexityMessage[],
  model?: string,
  deepThinking: boolean = false
): Promise<PerplexityResponse> {
  // Refresh session to ensure token is valid
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Session error:', sessionError);
    throw new Error('Not authenticated. Please sign in.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or anon key not configured');
  }

  console.log('Calling Perplexity Edge Function with session:', {
    hasToken: !!session.access_token,
    tokenLength: session.access_token?.length,
  });

  const response = await fetch(`${supabaseUrl}/functions/v1/Perplexity`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model,
      deepThinking,
    }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
    } catch (e) {
      // Keep default error message
    }
    console.error('Perplexity Edge Function error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorMessage,
    });
    
    // Provide more helpful error messages
    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    if (response.status === 500) {
      throw new Error('Perplexity API key not configured on server. Please check Supabase secrets.');
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Connection')) {
      throw new Error('Connection error: Unable to reach Perplexity API. Please check your internet connection.');
    }
    throw new Error(errorMessage);
  }

  // Handle SSE stream and collect full response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let citations: WebSource[] = [];

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
          // Extract citations from completion signal
          if (data.citations && Array.isArray(data.citations)) {
            citations = data.citations.map((url: string, index: number) => ({
              title: `Source ${index + 1}`,
              url,
              snippet: undefined,
            }));
          }
        } else if (data.content) {
          fullContent += data.content;
        }
      } catch (e) {
        // Skip invalid JSON lines
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return { content: fullContent, citations };
}

/**
 * Streams chat response from Perplexity Edge Function
 */
export async function streamChatWithPerplexity(
  messages: PerplexityMessage[],
  onChunk: (chunk: string) => void,
  model?: string,
  deepThinking: boolean = false
): Promise<PerplexityResponse> {
  // Refresh session to ensure token is valid
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Session error:', sessionError);
    throw new Error('Not authenticated. Please sign in.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or anon key not configured');
  }

  console.log('Calling Perplexity Edge Function with session:', {
    hasToken: !!session.access_token,
    tokenLength: session.access_token?.length,
  });

  const response = await fetch(`${supabaseUrl}/functions/v1/Perplexity`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model,
      deepThinking,
    }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
    } catch (e) {
      // Keep default error message
    }
    console.error('Perplexity Edge Function error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorMessage,
    });
    
    // Provide more helpful error messages
    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    if (response.status === 500) {
      throw new Error('Perplexity API key not configured on server. Please check Supabase secrets.');
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Connection')) {
      throw new Error('Connection error: Unable to reach Perplexity API. Please check your internet connection.');
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
  let citations: WebSource[] = [];

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
          // Extract citations from completion signal
          if (data.citations && Array.isArray(data.citations)) {
            citations = data.citations.map((url: string, index: number) => ({
              title: `Source ${index + 1}`,
              url,
              snippet: undefined,
            }));
          }
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

  return { content: fullContent, citations };
}
