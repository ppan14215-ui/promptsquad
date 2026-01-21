// @ts-nocheck - Deno runtime, not Node.js
// Clean Edge Function for chat - Simple authentication
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  mascotId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  skillId?: string;
  provider?: 'openai' | 'gemini';
  deepThinking?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('Gemini_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token (handle "Bearer " prefix with potential whitespace)
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    console.log('[Edge Function] Extracted token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('[Edge Function] Token length:', token.length);

    // Create admin client and validate token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[Edge Function] Created admin client, validating token...');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('[Edge Function] Auth result - User:', user?.id || 'none');
    console.log('[Edge Function] Auth result - Error:', authError?.message || 'none');
    console.log('[Edge Function] Auth result - Error code:', authError?.code || 'none');

    if (authError || !user) {
      console.error('[Edge Function] Authentication failed:', {
        error: authError?.message,
        code: authError?.code,
        hasToken: !!token,
        tokenLength: token?.length
      });
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authError?.message || 'Invalid token',
          code: authError?.code
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Edge Function] User authenticated:', user.id);

    // Parse request body
    const body: ChatRequest = await req.json();
    const { mascotId, messages, skillId, provider, deepThinking } = body;

    if (!mascotId || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get mascot
    const { data: mascot, error: mascotError } = await supabaseAdmin
      .from('mascots')
      .select('*')
      .eq('id', mascotId.toString())
      .single();

    if (mascotError || !mascot) {
      return new Response(
        JSON.stringify({ error: 'Mascot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get personality (try new table, fallback to old)
    let personality = '';
    const { data: personalityData } = await supabaseAdmin
      .from('mascot_personality')
      .select('personality')
      .eq('mascot_id', mascotId.toString())
      .maybeSingle();

    if (personalityData?.personality) {
      personality = personalityData.personality;
    } else {
      const { data: instructionsData } = await supabaseAdmin
        .from('mascot_instructions')
        .select('instructions')
        .eq('mascot_id', mascotId.toString())
        .maybeSingle();
      if (instructionsData?.instructions) {
        personality = instructionsData.instructions;
      }
    }

    // Get skill prompt if provided
    let skillPrompt = '';
    if (skillId) {
      const { data: skillData } = await supabaseAdmin
        .from('mascot_skills')
        .select('skill_prompt')
        .eq('id', skillId)
        .eq('mascot_id', mascotId.toString())
        .maybeSingle();
      if (skillData?.skill_prompt) {
        skillPrompt = skillData.skill_prompt;
      }
    }

    // Build system prompt
    let systemPrompt = `You are ${mascot.name}, ${mascot.subtitle || 'a helpful AI assistant'}.`;
    
    if (personality) {
      systemPrompt += `\n\n---\n\nYOUR PERSONALITY AND BEHAVIOR:\n\n${personality}`;
    }

    if (skillPrompt) {
      systemPrompt += `\n\n---\n\nSKILL-SPECIFIC INSTRUCTIONS:\n\n${skillPrompt}`;
    }

    // Determine provider and model
    const useProvider = provider || 'gemini';
    const useModel = deepThinking 
      ? (useProvider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro')
      : (useProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

    // OpenAI
    if (useProvider === 'openai' && openaiApiKey) {
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          messages: openaiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ error: `OpenAI error: ${error}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));
          
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'openai' })}\n\n`));
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
        },
      });
    }

    // Gemini (default)
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: useModel,
      systemInstruction: systemPrompt,
    });

    const geminiHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      geminiHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessageStream(lastMessage.content);

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'gemini' })}\n\n`));
          controller.close();
        } catch (error: any) {
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
      },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
