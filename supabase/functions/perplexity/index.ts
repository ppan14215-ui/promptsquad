// Supabase Edge Function for secure Perplexity API calls
// This function:
// 1. Verifies user authentication
// 2. Calls Perplexity API with the server-side API key
// 3. Streams the response back to the client with citations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerplexityRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  deepThinking?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${authError?.message || 'User not found'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { messages, model, deepThinking }: PerplexityRequest = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Perplexity API key from secrets
    const perplexityApiKey = Deno.env.get('Perplexity_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine model and settings
    const defaultModel = 'sonar-pro';
    const deepThinkingModel = 'sonar-reasoning';
    const effectiveModel = deepThinking ? deepThinkingModel : (model || defaultModel);
    const maxTokens = deepThinking ? 4096 : 2048;
    const temperature = deepThinking ? 0.5 : 0.7;

    // Call Perplexity API with streaming
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ error: `Perplexity error: ${error}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Perplexity stream to our format
    // Perplexity returns citations in a separate field after streaming completes
    let citations: string[] = [];

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n').filter((line) => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Send completion signal with citations
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ done: true, model: effectiveModel, citations })}\n\n`
              )
            );
          } else {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              // Extract citations if present
              if (parsed.citations && Array.isArray(parsed.citations)) {
                citations = parsed.citations;
              }
              
              if (content) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Perplexity function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
