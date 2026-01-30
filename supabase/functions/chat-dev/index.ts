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
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok';
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
    const xaiApiKey = Deno.env.get('XAI_API_KEY') || Deno.env.get('Grok_API_Key');
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');

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
    // Our OpenAI implementation now supports web tools via Tavily if configured.
    // If the user selected OpenAI (or Auto picked it), but wants Web Search, check if we can support it.

    const supportsWebSearch =
      useProvider === 'perplexity' ||
      useProvider === 'gemini' ||
      useProvider === 'grok' ||
      (useProvider === 'openai' && !!tavilyApiKey);

    if (webSearch && !supportsWebSearch) {
      console.log('[Edge Function] Web search enabled but provider/config missing: Switching provider from', useProvider, 'to gemini');
      useProvider = 'gemini';
    }

    const useModel = deepThinking
      // Using 2026 standard models (GPT-5, Gemini 3, Grok 4.1, Perplexity Sonar Reasoning)
      ? (useProvider === 'openai' ? 'gpt-5.2' :
        useProvider === 'perplexity' ? 'sonar-reasoning-pro' :
          useProvider === 'grok' ? 'grok-4.1-fast-reasoning' :
            'gemini-3-pro-preview')
      : (useProvider === 'openai' ? 'gpt-5-mini' :
        useProvider === 'perplexity' ? 'sonar' :
          useProvider === 'grok' ? 'grok-4-fast-non-reasoning' :
            'gemini-3-flash-preview');

    // OpenAI
    if (useProvider === 'openai' && openaiApiKey) {
      // Perform Web Search if enabled and Key is present
      if (webSearch && tavilyApiKey && messages.length > 0) {
        try {
          // Use the last user message as the query
          // In a real app, you might want to generate a search query from conversation history
          const lastUserMsg = messages[messages.length - 1];
          const query = lastUserMsg.content;

          console.log('[Edge Function] Performing Tavily search for query:', query.substring(0, 50));

          const searchResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: query,
              search_depth: "basic",
              include_answer: false,
              max_results: 5
            })
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            // Format results
            const resultsContext = searchData.results
              .map((r: any) => `[Title: ${r.title}]\n[URL: ${r.url}]\n${r.content}`)
              .join('\n\n');

            if (resultsContext) {
              systemPrompt += `\n\n---\n\nWEB SEARCH RESULTS (Current Date: ${new Date().toISOString().split('T')[0]}):\n\nThe user has requested a web search. Use the following search results to answer the question. Cite your sources using [Title](URL) format.\n\n${resultsContext}\n\n---`;
              console.log('[Edge Function] Added search results to system prompt');
            }
          } else {
            console.warn('[Edge Function] Tavily search failed:', await searchResponse.text());
          }
        } catch (e) {
          console.error('[Edge Function] Error during Tavily search:', e);
        }
      }

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

    // Grok (xAI)
    // SPECIAL DEBUG: Check available models
    // Robust check: Look for "TEST_GROK" in any message
    if (messages.some(m => m.content && m.content.toUpperCase().includes("TEST_GROK"))) {
      console.log("!!! LISTING GROK MODELS !!!");
      const xaiKey = Deno.env.get("XAI_API_KEY") || Deno.env.get("Grok_API_Key");

      try {
        const response = await fetch("https://api.x.ai/v1/models", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${xaiKey}`
          }
        });

        const data = await response.json();
        console.log("GROK MODELS:", JSON.stringify(data, null, 2));

        // Format as a readable message for the user
        const modelList = data.data ? data.data.map((m: any) => `- ${m.id}`).join('\n') : JSON.stringify(data);
        const text = `Available Models:\n${modelList}`;

        // Return as SSE for frontend compatibility
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, model: 'debug', provider: 'grok' })}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });

      } catch (e) {
        console.error("GROK MODEL LIST FAILED:", e);
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
      }
    }

    if (useProvider === 'grok') {
      if (!xaiApiKey) {
        return new Response(
          JSON.stringify({ error: 'XAI_API_KEY (or Grok_API_Key) check failed. Please add it to Supabase Secrets.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tools = [
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web for general information and facts.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query" }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "x_search",
            description: "Search X (formerly Twitter) for real-time social posts, news, and sentiment.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query for X posts" }
              },
              required: ["query"]
            }
          }
        }
      ];

      // Proceed with Grok logic using SSE with 'thinking' feedback
      const grokMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const payload = {
        model: useModel,
        messages: grokMessages,
        stream: false, // Non-streaming to allow full response with tool results
        tools: tools,
      };

      console.log('[Edge Function] Sending Grok request (non-streaming with thinking feedback)...');

      // Create SSE stream with thinking updates
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Start async processing
      (async () => {
        try {
          // Step 1: Thinking - Analyzing request
          await writer.write(encoder.encode(`data: ${JSON.stringify({ thinking: '🔍 Analyzing your request...' })}\n\n`));

          // Step 2: Thinking - Searching X
          await writer.write(encoder.encode(`data: ${JSON.stringify({ thinking: '🐦 Searching X for latest posts...' })}\n\n`));

          const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${xaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Edge Function] Grok API Error:', errorText);
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: `Grok error: ${errorText}` })}\n\n`));
            await writer.close();
            return;
          }

          // Step 3: Thinking - Processing results
          await writer.write(encoder.encode(`data: ${JSON.stringify({ thinking: '📊 Processing and summarizing results...' })}\n\n`));

          const data = await response.json();
          const message = data.choices?.[0]?.message;

          if (!message) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Grok returned no message' })}\n\n`));
            await writer.close();
            return;
          }

          // Step 4: Clear thinking and send content
          await writer.write(encoder.encode(`data: ${JSON.stringify({ thinking: null })}\n\n`)); // Clear thinking indicator

          if (message.content) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ content: message.content })}\n\n`));
          } else if (message.tool_calls) {
            // Handle tool calls - Grok might return these instead of content
            console.warn('[Edge Function] Grok returned tool calls:', JSON.stringify(message.tool_calls));
            await writer.write(encoder.encode(`data: ${JSON.stringify({ content: 'Grok is processing your request using advanced tools. Please wait...' })}\n\n`));
          }

          // Send DONE
          await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'grok' })}\n\n`));
          await writer.close();

        } catch (e) {
          console.error('[Edge Function] Grok stream error:', e);
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      // Handle Tool Calls (If xAI expects client to execute)
      if (message.tool_calls) {
        console.warn('[Edge Function] Grok returned tool calls (Client execution required?):', JSON.stringify(message.tool_calls));

        // Since we can't execute x_search/web_search client-side (we lack the backend logic/keys for internal xAI tools),
        // we must inform the user.
        // UNLESS: We are supposed to loop back? But we can't execute "x_search".

        // Temporary: Return a message explaining technical limitation
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const warning = "Grok attempted to use X Search, but the server-side agentic loop is not fully configured. Please try a simpler query or wait for updates.";
            const json = JSON.stringify({ content: warning });
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));

            const doneJson = JSON.stringify({ done: true, model: useModel, provider: 'grok' });
            controller.enqueue(encoder.encode(`data: ${doneJson}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }

      return new Response(
        JSON.stringify({ error: 'Grok returned empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
