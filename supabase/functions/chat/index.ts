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
  skillId?: string; // Optional skill ID to include skill prompt
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
    const authHeader = req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey');
    
    console.log('[Edge Function] Received request');
    console.log('[Edge Function] Has Authorization header:', !!authHeader);
    console.log('[Edge Function] Has apikey header:', !!apikeyHeader);
    
    if (!authHeader) {
      console.error('[Edge Function] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract bearer token
    const token = authHeader.replace('Bearer', '').trim();
    if (!token) {
      console.error('[Edge Function] Authorization header present but no token');
      return new Response(
        JSON.stringify({ error: 'Invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for accessing protected data and validating JWT
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated using service role (more reliable in Edge Functions)
    console.log('[Edge Function] Verifying user authentication...');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError) {
      console.error('[Edge Function] Auth error:', authError);
      console.error('[Edge Function] Auth error code:', authError.code);
      console.error('[Edge Function] Auth error message:', authError.message);
    }
    
    if (!user) {
      console.error('[Edge Function] No user found');
    }
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          details: authError?.message,
          code: authError?.code 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Edge Function] User authenticated:', user.id);

    // Parse request body
    const { mascotId, messages, conversationId, skillId }: ChatRequest = await req.json();

    if (!mascotId || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mascotId, messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert simple mascot ID to UUID if needed
    // Map simple IDs (1-20) to UUIDs
    const MASCOT_ID_TO_UUID: Record<string, string> = {
      '1': '11111111-1111-1111-1111-111111111111',
      '2': '22222222-2222-2222-2222-222222222222',
      '3': '33333333-3333-3333-3333-333333333333',
      '4': '44444444-4444-4444-4444-444444444444',
      '5': '55555555-5555-5555-5555-555555555555',
      '6': '66666666-6666-6666-6666-666666666666',
      '7': '77777777-7777-7777-7777-777777777777',
      '8': '88888888-8888-8888-8888-888888888888',
      '9': '99999999-9999-9999-9999-999999999999',
      '10': '10101010-1010-1010-1010-101010101010',
      '11': '11111111-1111-1111-1111-111111111112',
      '12': '12121212-1212-1212-1212-121212121212',
      '13': '13131313-1313-1313-1313-131313131313',
      '14': '14141414-1414-1414-1414-141414141414',
      '15': '15151515-1515-1515-1515-151515151515',
      '16': '16161616-1616-1616-1616-161616161616',
      '17': '17171717-1717-1717-1717-171717171717',
      '18': '18181818-1818-1818-1818-181818181818',
      '19': '19191919-1919-1919-1919-191919191919',
      '20': '20202020-2020-2020-2020-202020202020',
    };
    
    // Convert simple ID to UUID if needed
    const mascotUUID = mascotId.includes('-') && mascotId.length === 36 
      ? mascotId 
      : (MASCOT_ID_TO_UUID[mascotId] || mascotId);

    // Fetch mascot info
    const { data: mascot, error: mascotError } = await supabaseAdmin
      .from('mascots')
      .select('*')
      .eq('id', mascotUUID)
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
      .eq('mascot_id', mascotUUID)
      .single();

    if (promptError || !promptData) {
      return new Response(
        JSON.stringify({ error: 'Mascot prompt not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch instructions if available
    const { data: instructionsData } = await supabaseAdmin
      .from('mascot_instructions')
      .select('instructions')
      .eq('mascot_id', mascotUUID)
      .single();

    // Fetch skill prompt if skillId is provided
    let skillPrompt = '';
    if (skillId) {
      const { data: skillsData } = await supabaseAdmin
        .rpc('get_mascot_skills', { p_mascot_id: mascotUUID });
      
      if (skillsData) {
        const skill = skillsData.find((s: any) => s.id === skillId);
        if (skill?.skill_prompt) {
          skillPrompt = skill.skill_prompt;
        }
      }
    }

    // Combine system prompt with instructions and skill prompt
    let combinedSystemPrompt = promptData.system_prompt;
    if (instructionsData?.instructions) {
      combinedSystemPrompt = `${combinedSystemPrompt}\n\n---\n\n${instructionsData.instructions}`;
    }
    if (skillPrompt) {
      combinedSystemPrompt = `${combinedSystemPrompt}\n\n---\n\nIMPORTANT: The following skill-specific instructions must be followed precisely and take precedence when relevant:\n\n${skillPrompt}`;
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
        systemInstruction: combinedSystemPrompt,
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
        { role: 'system', content: combinedSystemPrompt },
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

