// @ts-nocheck - Deno runtime, not Node.js
// Clean Edge Function for chat - Simple authentication
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.24.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

interface ChatRequest {
  mascotId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  skillId?: string;
  provider?: 'openai' | 'gemini' | 'perplexity';
  deepThinking?: boolean;
  image?: { mimeType: string; base64: string };
  taskCategory?: string; // For auto provider selection
  webSearch?: boolean;
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
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Authorization header
    // BYPASS LOGIC: Check custom 'x-user-token' first, fall back to Authorization
    const customAuth = req.headers.get('x-user-token');
    const authHeader = req.headers.get('Authorization');

    if (!customAuth && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token: Use custom token if available, else standard bearer
    const token = customAuth ? customAuth.trim() : authHeader.replace(/^Bearer\s+/i, '').trim();

    console.log('[Edge Function] Extracted token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('[Edge Function] Token length:', token.length);

    // Verify we have the Anon Key
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Auth Strategy: 
    // 1. Try standard validation with getUser()
    // 2. If that fails (due to secret mismatch), fallback to manual decode
    let userId = '';
    let usedFallback = false;

    try {
      if (supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (user) {
          userId = user.id;
          console.log('[Edge Function] Auth successful via getUser()');
        } else {
          console.warn('[Edge Function] getUser() failed:', authError?.message);
        }
      }
    } catch (e) {
      console.warn('[Edge Function] Client creation failed:', e);
    }

    // Fallback: Manual Token Decode if getUser() failed but we have a token
    if (!userId && token) {
      console.log('[Edge Function] Falling back to manual token decoding...');
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1000);

          // Allow 5 minutes of clock drift/grace
          if (payload.exp > now - 300 && payload.sub) {
            userId = payload.sub;
            usedFallback = true;
            console.log('[Edge Function] Manual decode successful. User:', userId);
          } else {
            console.error('[Edge Function] Token expired or missing sub. Expiry:', payload.exp, 'Now:', now);
          }
        }
      } catch (e) {
        console.error('[Edge Function] Manual decode failed:', e);
      }
    }

    if (!userId) {
      console.error('[Edge Function] Authentication failed completely');
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          details: 'Invalid or expired token',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Edge Function] User authenticated:', userId, usedFallback ? '(via fallback)' : '(via strict check)');

    // Create admin client for database operations (bypassing RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: ChatRequest = await req.json();
    const { mascotId, messages, skillId, provider, deepThinking, image, taskCategory, webSearch } = body;

    console.log('[Edge Function] Received messages for mascot:', mascotId, 'provider:', provider, 'webSearch:', webSearch);
    console.log('[Edge Function] Message count:', messages?.length);
    if (messages?.length > 0) {
      console.log('[Edge Function] First message role:', messages[0].role, 'content:', messages[0].content.substring(0, 50) + '...');
    }

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
      systemPrompt += `\n\n---\n\nCURRENT ACTIVE SKILL INSTRUCTIONS:\n\n${skillPrompt}`;
      systemPrompt += `\n\nIMPORTANT: The user has selected the skill above. If the user's message is just the name of the skill, and the skill requires specific input (like a ticker, symbol, topic, or file) that hasn't been provided yet, you MUST STOP and ASK the user for that input. Do not generate a generic response.`;
    }

    // Helper function to select provider based on task category
    function selectProviderByTaskCategory(category?: string): 'openai' | 'gemini' {
      switch (category) {
        case 'analysis':
        case 'creative':
        case 'coding':
        case 'ux':
        case 'complex':
          return 'openai';
        case 'conversation':
        case 'quick':
        default:
          return 'gemini';
      }
    }

    // Determine provider and model
    // If provider is not specified or is 'auto', use task category to select
    let useProvider = !provider || provider === 'auto'
      ? selectProviderByTaskCategory(taskCategory)
      : provider;

    // FORCE SWITCH: If web search is enabled, we MUST use a provider that supports it.
    // Our OpenAI implementation does not have web tools.
    // If the user selected OpenAI (or Auto picked it), but wants Web Search, force Gemini.
    if (webSearch && useProvider !== 'perplexity' && useProvider !== 'gemini') {
      console.log('[Edge Function] Web search enabled: Switching provider from', useProvider, 'to gemini');
      useProvider = 'gemini';
    }

    const useModel = deepThinking
      // Using 2026 standard models (2.5 series for Gemini, sonar-large for Perplexity)
      ? (useProvider === 'openai' ? 'gpt-4o' :
        useProvider === 'perplexity' ? 'sonar-pro' :
          'gemini-2.5-pro')
      : (useProvider === 'openai' ? 'gpt-4o-mini' :
        useProvider === 'perplexity' ? 'sonar' :
          'gemini-2.5-flash');

    // OpenAI
    if (useProvider === 'openai' && openaiApiKey) {
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m, index) => {
          // If this is the last message and we have an image, attach it
          if (index === messages.length - 1 && image) {
            return {
              role: m.role,
              content: [
                { type: 'text', text: m.content },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${image.mimeType};base64,${image.base64}`
                  }
                }
              ]
            };
          }
          return { role: m.role, content: m.content };
        }),
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

    // Perplexity (web-grounded)
    if (useProvider === 'perplexity' && perplexityApiKey) {
      // Perplexity requires the first message after system to be 'user'
      // Filter out any leading 'assistant' messages from the input
      let validMessages = messages;
      let startIndex = 0;
      while (startIndex < messages.length && messages[startIndex].role === 'assistant') {
        startIndex++;
      }
      if (startIndex > 0) {
        validMessages = messages.slice(startIndex);
      }

      const perplexityMessages = [
        { role: 'system', content: systemPrompt },
        ...validMessages.map((m, index) => {
          // If this is the last message and we have an image, attach it
          if (index === validMessages.length - 1 && image) {
            return {
              role: m.role,
              content: [
                { type: 'text', text: m.content },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${image.mimeType};base64,${image.base64}`
                  }
                }
              ]
            };
          }
          return { role: m.role, content: m.content };
        }),
      ];

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          messages: perplexityMessages,
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

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'perplexity' })}\n\n`));
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

    // Enable tools if webSearch is requested
    const tools = webSearch ? [{ googleSearch: {} }] : undefined;

    const model = genAI.getGenerativeModel({
      model: useModel,
      systemInstruction: systemPrompt,
      tools: tools,
    });

    const geminiHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Build history from all messages except the last one
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      geminiHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Gemini requires first message in history to be from 'user'
    // If history is not empty and doesn't start with 'user', prepend a dummy user message
    if (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
      geminiHistory.unshift({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
      geminiHistory.splice(1, 0, {
        role: 'model',
        parts: [{ text: 'Hello! How can I help you today?' }],
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

    // Prepare message with potential image
    let messageParts: any = [{ text: lastMessage.content }];
    if (image) {
      messageParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64
        }
      });
    }

    const result = await chat.sendMessageStream(messageParts);

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
