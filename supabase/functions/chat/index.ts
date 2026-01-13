// Supabase Edge Function for secure AI chat
// This function:
// 1. Verifies user authentication
// 2. Fetches the mascot's hidden system prompt from the database
// 3. Calls the AI provider with the prompt injected
// 4. Streams the response back to the client

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  mascotId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  conversationId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for accessing mascot_prompts
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Client for auth verification (uses anon key + user's JWT)
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for accessing protected data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { mascotId, messages, conversationId }: ChatRequest = await req.json();

    if (!mascotId || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mascotId, messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch mascot info
    const { data: mascot, error: mascotError } = await supabaseAdmin
      .from('mascots')
      .select('*')
      .eq('id', mascotId)
      .single();

    if (mascotError || !mascot) {
      return new Response(
        JSON.stringify({ error: 'Mascot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the hidden system prompt (only accessible via service role)
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('mascot_prompts')
      .select('system_prompt')
      .eq('mascot_id', mascotId)
      .single();

    if (promptError || !promptData) {
      return new Response(
        JSON.stringify({ error: 'Mascot prompt not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has access to this mascot (free or unlocked)
    if (!mascot.is_free) {
      const { data: userMascot } = await supabaseClient
        .from('user_mascots')
        .select('id')
        .eq('user_id', user.id)
        .eq('mascot_id', mascotId)
        .single();

      // Also check subscription status
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_subscribed, subscription_expires_at')
        .eq('id', user.id)
        .single();

      const isSubscribed = profile?.is_subscribed && 
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

      if (!userMascot && !isSubscribed) {
        return new Response(
          JSON.stringify({ error: 'Mascot not unlocked. Please purchase or subscribe.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get AI provider credentials
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Route to appropriate AI provider
    if (mascot.ai_provider === 'gemini') {
      if (!geminiApiKey) {
        return new Response(
          JSON.stringify({ error: 'Gemini API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ 
        model: mascot.ai_model || 'gemini-1.5-flash',
        systemInstruction: promptData.system_prompt,
      });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const lastMessage = messages[messages.length - 1];
      const chat = model.startChat({ history });

      // Stream the response
      const result = await chat.sendMessageStream(lastMessage.content);

      // Create a readable stream for the response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              }
            }
            
            // Send completion signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, model: mascot.ai_model })}\n\n`));
            controller.close();
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } else if (mascot.ai_provider === 'openai') {
      if (!openaiApiKey) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // OpenAI streaming implementation
      const openaiMessages = [
        { role: 'system', content: promptData.system_prompt },
        ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: mascot.ai_model || 'gpt-4o-mini',
          messages: openaiMessages,
          stream: true,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ error: `OpenAI error: ${error}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Transform OpenAI stream to our format
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n').filter((line) => line.startsWith('data: '));
          
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: mascot.ai_model })}\n\n`));
            } else {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
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

    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported AI provider: ${mascot.ai_provider}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

