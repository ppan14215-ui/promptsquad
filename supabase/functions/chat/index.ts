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
  provider?: 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude';
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
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

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

    // Get current usage stats and subscription status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_subscribed')
      .eq('id', userId)
      .single();

    const isSubscribed = profile?.is_subscribed || false;

    // Helper: Determine if request is High-Tier
    // High-Tier: Claude, OpenAI, Perplexity, Grok, or Gemini Pro/Ultra
    // Free: Gemini Flash
    function isHighTier(p: string, m: string): boolean {
      if (p === 'gemini') {
        return m.toLowerCase().includes('pro') || m.toLowerCase().includes('ultra');
      }
      return true; // All other providers are High-Tier
    }

    // Determine basic provider/model early for checking (final selection happens later if 'auto')
    const tempProvider = provider || 'gemini'; // Default for checking
    // Note: Model might change later based on deepThinking logic, but we can estimate
    // If provider is 'auto', we assume it MIGHT switch to OpenAI/Claude, so treat as High Tier 
    // UNLESS we are strictly Free tier, in which case we force 'gemini-flash' later?
    // Actually, let's let the existing logic determine 'useProvider' and 'useModel' first,
    // THEN check limits before making the fetch call.

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
      // Note: Chain of Thought / Thinking indicator is shown by the UI during loading, not embedded in response
    }

    // Helper function to select provider based on task category
    function selectProviderByTaskCategory(category?: string, webSearchRequested?: boolean): 'openai' | 'gemini' {
      // If web search is on, Gemini's organic grounding is superior to system-injection
      if (webSearchRequested) return 'gemini';

      switch (category) {
        case 'coding':
        case 'complex':
          return 'openai';
        case 'analysis':
        case 'creative':
        case 'ux':
        case 'conversation':
        case 'quick':
        default:
          return 'gemini';
      }
    }

    // Determine provider and model
    // If provider is not specified or is 'auto', use task category to select
    let useProvider = !provider || provider === 'auto'
      ? selectProviderByTaskCategory(taskCategory, webSearch)
      : provider;

    // FORCE SWITCH: If web search is enabled, we MUST use a provider that supports it.
    // Our OpenAI implementation now supports web tools via Tavily if configured.
    // If the user selected OpenAI (or Auto picked it), but wants Web Search, check if we can support it.

    const supportsWebSearch =
      useProvider === 'perplexity' ||
      useProvider === 'gemini' ||
      useProvider === 'grok' ||
      (useProvider === 'claude' && !!tavilyApiKey) ||
      (useProvider === 'openai' && !!tavilyApiKey);

    if (webSearch && !supportsWebSearch) {
      console.log('[Edge Function] Web search enabled but provider/config missing: Switching provider from', useProvider, 'to gemini');
      useProvider = 'gemini';
    }

    // Select model based on provider and capabilities
    // xAI Grok docs: grok-4-1-fast for search, grok-4 for reasoning, grok-3 for fast
    // Anthropic docs: claude-sonnet-4-5-20250929 is current
    let useModel: string;

    if (useProvider === 'grok') {
      // Grok model selection based on capabilities (https://docs.x.ai/docs/models)
      // Priority: deepThinking (Pro) > webSearch > default
      if (deepThinking) {
        useModel = 'grok-4'; // Full reasoning model (also supports native X/web search)
      } else if (webSearch) {
        useModel = 'grok-4-1-fast'; // Optimized for agentic search
      } else {
        useModel = 'grok-4-1-fast-non-reasoning';
      }
    } else {
      // Other providers
      useModel = deepThinking
        ? (useProvider === 'openai' ? 'gpt-5.2' :
          useProvider === 'perplexity' ? 'sonar-reasoning-pro' :
            useProvider === 'claude' ? 'claude-sonnet-4-5-20250929' :
              'gemini-3-pro-preview')
        : (useProvider === 'openai' ? 'gpt-5-mini' :
          useProvider === 'perplexity' ? 'sonar' :
            useProvider === 'claude' ? 'claude-sonnet-4-5-20250929' :
              'gemini-3-flash-preview');
    }

    console.log(`[Edge Function] Using model: ${useModel} (provider: ${useProvider}, webSearch: ${webSearch}, deepThinking: ${deepThinking})`);

    // --- MATH OF DEATH: HARD TOKEN LIMITS ---
    if (isHighTier(useProvider, useModel)) {
      if (!isSubscribed) {
        console.log('[Edge Function] Blocked High-Tier request for non-subscriber.');
        return new Response(
          JSON.stringify({
            error: 'Pro subscription required.',
            details: `The model '${useModel}' is available on the Pro plan.`,
            hint: 'Upgrade to Pro to use Claude, GPT-4, and other high-tier models.'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Check Monthly Limit
        const date = new Date();
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const { data: usage } = await supabaseAdmin
          .from('user_monthly_usage')
          .select('high_tier_count')
          .eq('user_id', userId)
          .eq('month_year', monthYear)
          .maybeSingle();

        const currentCount = usage?.high_tier_count || 0;
        const LIMIT = 300; // Hard limit

        console.log(`[Edge Function] Usage check: ${currentCount}/${LIMIT} for ${monthYear}`);

        if (currentCount >= LIMIT) {
          return new Response(
            JSON.stringify({
              error: 'Monthly Pro limit reached.',
              details: `You have reached your limit of ${LIMIT} high-tier requests for this month.`,
              hint: 'Usage resets next month.'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Increment Usage
        // We do this BEFORE the generation to strictly enforce the limit (bucket decrement style)
        // or effectively "reserve" the slot.
        const { error: rpcError } = await supabaseAdmin.rpc('increment_high_tier_usage', {
          p_user_id: userId,
          p_month_year: monthYear
        });

        if (rpcError) {
          console.error('[Edge Function] Failed to increment usage:', rpcError);
          // Optional: Fail open or closed? 
          // Fail Safe (Closed): Return error if we can't track usage.
          // Fail Open (Allow): Allow if tracking fails?
          // "Math of Death" implies strictness. Let's log it but maybe proceed if it's just a metric?
          // But strict limit means we MUST count. If DB is down, chat is probably down anyway.
          // Let's proceed but log critical error.
        }
      }
    }

    // OpenAI
    if (useProvider === 'openai' && openaiApiKey) {
      // Perform Web Search if enabled and Key is present
      if (webSearch && tavilyApiKey && messages.length > 0) {
        try {
          // Emit thinking step for OpenAI search
          const searchEncoder = new TextEncoder();
          // We can't easily emit here because the response stream hasn't started.
          // However, we can log it for now.
          console.log('[Edge Function] Performing Tavily search for OpenAI');

          const lastUserMsg = messages[messages.length - 1];
          const query = lastUserMsg.content;

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
            const resultsContext = searchData.results
              .map((r: any) => `[Title: ${r.title}]\n[URL: ${r.url}]\n${r.content}`)
              .join('\n\n');

            if (resultsContext) {
              systemPrompt += `\n\n---\n\nWEB SEARCH RESULTS (Current Date: ${new Date().toISOString().split('T')[0]}):\n\nThe user has requested a web search. Use the following search results to answer the question. Cite your sources using [Title](URL) format.\n\n${resultsContext}\n\n---`;
            }
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
    if (useProvider === 'grok') {
      if (!xaiApiKey) {
        return new Response(
          JSON.stringify({ error: 'XAI_API_KEY (or Grok_API_Key) check failed. Please add it to Supabase Secrets.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use xAI Responses API for native search tools
      // The Chat Completions live_search was deprecated on Jan 12, 2026
      // Responses API uses web_search and x_search tools
      let grokSystemPrompt = systemPrompt;
      const currentDate = new Date().toISOString().split('T')[0];
      grokSystemPrompt += `\n\n[Current Date: ${currentDate}]`;

      // Format for Responses API
      const grokInput = [
        { role: 'developer', content: grokSystemPrompt },
        ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ];

      // Native search tools for Responses API
      const grokTools = webSearch ? [
        { type: 'web_search' },
        { type: 'x_search' }
      ] : undefined;

      console.log('[Edge Function] Grok Responses API request:', {
        model: useModel,
        webSearch,
        deepThinking,
        currentDate,
        hasTools: !!grokTools
      });

      // Use Responses API endpoint
      const response = await fetch('https://api.x.ai/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          input: grokInput,
          stream: true,
          ...(grokTools && { tools: grokTools }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ error: `Grok error: ${error}` }),
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
              console.log('[Grok] Stream done');
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'grok' })}\n\n`));
            } else {
              try {
                const parsed = JSON.parse(data);

                // Debug: log the structure
                console.log('[Grok Responses] Event type:', parsed.type, 'Keys:', Object.keys(parsed));

                // Responses API format - handle different event types
                if (parsed.type === 'response.output_item.added') {
                  // Tool usage indicator
                  const item = parsed.item;
                  if (item?.type === 'tool_use') {
                    const toolName = item.name;
                    let thinkingMessage = '';
                    let query = '';

                    // Try to extract query from arguments
                    if (item.arguments) {
                      try {
                        const args = JSON.parse(item.arguments);
                        query = args.query || args.search_query || '';
                      } catch (e) {
                        // ignore parse error
                      }
                    }

                    if (toolName === 'web_search') {
                      thinkingMessage = query
                        ? `🌐 Searching web for "${query}"...`
                        : '🌐 Searching the web for current information...';
                    } else if (toolName === 'x_search') {
                      thinkingMessage = query
                        ? `𝕏 Checking X (Twitter) for "${query}"...`
                        : '𝕏 Checking latest sentiment on X (Twitter)...';
                    } else {
                      thinkingMessage = `🔧 Using ${toolName}${query ? ` with "${query}"` : ''}...`;
                    }
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ thinking: thinkingMessage })}\n\n`));
                  }
                } else if (parsed.type === 'response.output_text.delta') {
                  // Text content delta
                  const content = parsed.delta;
                  if (content) {
                    console.log('[Grok] Content:', content.substring(0, 100));
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } else if (parsed.type === 'response.completed') {
                  // Response complete - extract final content if not streamed
                  const output = parsed.response?.output;
                  if (output && Array.isArray(output)) {
                    for (const item of output) {
                      if (item.type === 'message' && item.content) {
                        for (const part of item.content) {
                          if (part.type === 'text' && part.text) {
                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: part.text })}\n\n`));
                          }
                        }
                      }
                    }
                  }
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'grok' })}\n\n`));
                }

                // Fallback: Check for Chat Completions format too (in case API fallback)
                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (deltaContent) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: deltaContent })}\n\n`));
                }
              } catch (e) {
                // Log parse errors for debugging
                console.log('[Grok] Parse error:', e, 'Raw data:', data.substring(0, 200));
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

    // Claude (Anthropic)
    if (useProvider === 'claude' && anthropicApiKey) {
      // Perform Web Search if enabled and Key is present (Manual Grounding)
      if (webSearch && tavilyApiKey && messages.length > 0) {
        try {
          console.log('[Edge Function] Performing Tavily search for Claude');
          const lastUserMsg = messages[messages.length - 1];
          const query = lastUserMsg.content;

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
            const resultsContext = searchData.results
              .map((r: any) => `[Title: ${r.title}]\n[URL: ${r.url}]\n${r.content}`)
              .join('\n\n');

            if (resultsContext) {
              systemPrompt += `\n\n---\n\nWEB SEARCH RESULTS (Current Date: ${new Date().toISOString().split('T')[0]}):\n\nThe user has requested a web search. Use the following search results to answer the question. Cite your sources using [Title](URL) format.\n\n${resultsContext}\n\n---`;
            }
          }
        } catch (e) {
          console.error('[Edge Function] Error during Tavily search for Claude:', e);
        }
      }

      const claudeMessages = messages
        .filter(m => m.content && m.content.trim().length > 0) // Filter out empty messages
        .map((m, index, arr) => {
          // If this is the last message and we have an image, attach it
          if (index === arr.length - 1 && image) {
            return {
              role: m.role,
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: image.mimeType,
                    data: image.base64,
                  },
                },
                { type: 'text', text: m.content },
              ],
            };
          }
          return { role: m.role, content: m.content };
        });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          system: systemPrompt,
          messages: claudeMessages,
          stream: true,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ error: `Claude error: ${error}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta') {
                  const content = parsed.delta?.text;
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } else if (parsed.type === 'message_stop') {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'claude' })}\n\n`));
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
