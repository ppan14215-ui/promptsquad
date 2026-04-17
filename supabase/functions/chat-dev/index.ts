// @ts-nocheck - Deno runtime, not Node.js
// Clean Edge Function for chat - Simple authentication
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm';
import { GoogleGenerativeAI } from 'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/+esm';
import { corsHeaders } from '../_shared/cors.ts';

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
  /** Same as x-user-token when browsers block that header (CORS). Stripped before handling. */
  _authAccessToken?: string;
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

    // Read body once: web clients send user JWT in _authAccessToken (CORS) instead of x-user-token.
    let rawBody = '';
    try {
      rawBody = await req.text();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Bad request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedBody: ChatRequest | null = null;
    if (rawBody.trim()) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const bodyAuthToken =
      parsedBody && typeof parsedBody._authAccessToken === 'string'
        ? parsedBody._authAccessToken.trim()
        : '';
    if (parsedBody && '_authAccessToken' in parsedBody) {
      delete parsedBody._authAccessToken;
    }

    // Get Authorization header
    // BYPASS LOGIC: x-user-token OR body _authAccessToken (web), else Authorization bearer (anon key)
    const customAuth = (req.headers.get('x-user-token') || bodyAuthToken || '').trim();
    const authHeader = req.headers.get('Authorization');

    if (!customAuth && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User session JWT (header or body); else gateway anon key from Authorization
    const token = customAuth ? customAuth.trim() : authHeader.replace(/^Bearer\s+/i, '').trim();

    console.log('[Edge Function] Extracted token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('[Edge Function] Token length:', token.length);

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    /** JWT payload uses base64url; atob() alone often fails on segment 2 */
    const decodeJwtPayload = (jwt) => {
      try {
        const parts = jwt.split('.');
        if (parts.length !== 3) return null;
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4;
        if (pad) b64 += '='.repeat(4 - pad);
        return JSON.parse(atob(b64));
      } catch {
        return null;
      }
    };

    let userId = '';
    let usedFallback = false;

    try {
      if (supabaseAnonKey) {
        const authForUser = customAuth ? `Bearer ${customAuth}` : authHeader;
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authForUser } },
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

    if (!userId && token) {
      console.log('[Edge Function] Falling back to manual token decoding...');
      try {
        const payload = decodeJwtPayload(token);
        if (payload) {
          const now = Math.floor(Date.now() / 1000);
          const sub = payload.sub;
          if (payload.exp > now - 300 && sub && typeof sub === 'string') {
            userId = sub;
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

    if (!parsedBody) {
      return new Response(
        JSON.stringify({ error: 'Missing request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = parsedBody;
    const {
      mascotId,
      messages,
      skillId,
      provider: rawProvider,
      deepThinking,
      image,
      taskCategory,
      webSearch,
    } = body;

    const normalizeProviderInput = (p: unknown): string | undefined => {
      if (p == null || typeof p !== 'string') return undefined;
      const x = p.toLowerCase().trim();
      if (['openai', 'gemini', 'perplexity', 'grok', 'claude', 'auto'].includes(x)) return x;
      return undefined;
    };
    const clientProvider = normalizeProviderInput(rawProvider);

    console.log('[Edge Function] Received messages for mascot:', mascotId, 'provider:', clientProvider, 'webSearch:', webSearch);
    console.log('[Edge Function] Message count:', messages?.length);
    if (messages?.length > 0) {
      console.log('[Edge Function] First message role:', messages[0].role, 'content:', messages[0].content.substring(0, 50) + '...');
    }

    // Get current usage stats and subscription status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_subscribed, role')
      .eq('id', userId)
      .single();

    const isSubscribed = profile?.is_subscribed || false;
    const isAdmin = profile?.role === 'admin';

    // Helper: Determine if request is High-Tier
    // High-Tier: Claude, Perplexity, Grok, Gemini Pro/Ultra, or OpenAI non-mini
    // Free: Gemini Flash, GPT Mini
    function isHighTier(p: string, m: string): boolean {
      const modelLower = m.toLowerCase();
      if (p === 'gemini') {
        return modelLower.includes('pro') || modelLower.includes('ultra');
      }
      if (p === 'openai') {
        // GPT Mini models are free tier
        return !modelLower.includes('mini');
      }
      return true; // All other providers are High-Tier
    }

    const isOpenAIReasoningModel = (model: string): boolean => {
      const lower = (model || '').toLowerCase();
      return /(^|[^a-z0-9])(o1|o1-mini|o3|o3-mini|o4-mini)([^a-z0-9]|$)/.test(lower);
    };

    const supportsAnthropicThinking = (model: string): boolean => {
      const lower = (model || '').toLowerCase();
      return (
        lower.includes('claude-3-7-sonnet') ||
        lower.includes('claude-sonnet-4') ||
        lower.includes('claude-opus-4') ||
        lower.includes('claude-4-6')
      );
    };

    const supportsGeminiThinking = (model: string): boolean => {
      const lower = (model || '').toLowerCase();
      return (
        lower.includes('gemini-2.5-pro') ||
        lower.includes('gemini-2.5-flash') ||
        lower.includes('gemini-2.5-flash-lite') ||
        lower.includes('gemini-2.0-flash-thinking') ||
        lower.includes('gemini-3-pro') ||
        lower.includes('gemini-3-flash') ||
        lower.includes('gemini-3-pro-preview') ||
        lower.includes('gemini-3-flash-preview')
      );
    };

    // Determine basic provider/model early for checking (final selection happens later if 'auto')
    const tempProvider = clientProvider || 'gemini'; // Default for checking
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

    // Resolve skill by UUID or by label (home/agents deep links often pass skill_label as skillId)
    let skillPrompt = '';
    let skillPreferredResolved: string | undefined;
    if (skillId) {
      const sid = String(skillId);
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let skillRow: { skill_prompt: string | null; preferred_provider: string | null } | null = null;
      if (uuidRe.test(sid)) {
        const { data } = await supabaseAdmin
          .from('mascot_skills')
          .select('skill_prompt, preferred_provider')
          .eq('id', sid)
          .eq('mascot_id', mascotId.toString())
          .maybeSingle();
        skillRow = data;
      }
      if (!skillRow) {
        const { data } = await supabaseAdmin
          .from('mascot_skills')
          .select('skill_prompt, preferred_provider')
          .eq('skill_label', sid)
          .eq('mascot_id', mascotId.toString())
          .eq('is_active', true)
          .maybeSingle();
        skillRow = data;
      }
      if (skillRow?.skill_prompt) skillPrompt = skillRow.skill_prompt;
      const sp = normalizeProviderInput(skillRow?.preferred_provider);
      if (sp && sp !== 'auto') skillPreferredResolved = sp;
    }

    let useProvider = clientProvider;
    if ((!useProvider || useProvider === 'auto') && skillPreferredResolved) {
      useProvider = skillPreferredResolved;
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

    // Add search instructions if web search is enabled
    // Only Add instructions if we are NOT using a provider that handles this natively (like Perplexity or Grok)
    // Actually, for consistency, we can add a small note, but the tools definition handles the mechanism.
    if (webSearch && useProvider !== 'perplexity' && useProvider !== 'grok') {
      systemPrompt += `\n\n---\n\nWEB SEARCH ENABLED:\nYou have access to Google Search. Verify facts and provide up-to-date information. Cite your sources using [Title](URL) format at the end of your response.`;
    }

    // Calendar anchor for every request — without this, models often infer the wrong year/month from training priors.
    {
      const now = new Date();
      const utcDateStr = now.toISOString().split('T')[0];
      const utcWeekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const utcMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      systemPrompt += `\n\n---\n\nCURRENT DATE CONTEXT (use for all time-sensitive analysis, news, and "today" questions; do not assume a different calendar year):\nToday is ${utcWeekday}, ${utcDateStr} (UTC). For month/year context: ${utcMonthYear}. If the user needs local time or a specific timezone, ask.`;
    }

    // Determine Provider and Model — task defaults when still auto / unset
    if (!useProvider || useProvider === 'auto' as any) {
      if (taskCategory === 'creative') {
        useProvider = 'gemini'; // Gemini 1.5 Pro is great for creative
      } else if (taskCategory === 'ux' || taskCategory === 'coding') {
        useProvider = 'claude'; // Claude is king of code/UX
      } else if (taskCategory === 'analysis') {
        useProvider = 'openai'; // GPT-5 is good at analysis
      } else {
        useProvider = 'gemini'; // Default
      }
    }

    if (webSearch && (!clientProvider || clientProvider === 'auto') && !skillPreferredResolved) {
      useProvider = 'gemini';
    }

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
        useModel = 'grok-4-1-fast'; // Latest generally available Grok family model
      } else if (webSearch) {
        useModel = 'grok-4-1-fast'; // Optimized for agentic search
      } else {
        useModel = 'grok-4-1-fast-non-reasoning';
      }
    } else {
      // Other providers
      useModel = deepThinking
        ? (useProvider === 'openai' ? 'gpt-5.4' :
          useProvider === 'perplexity' ? 'sonar-reasoning-pro' :
            useProvider === 'claude' ? 'claude-sonnet-4-5-20250929' :
              'gemini-3-pro-preview')
        : (useProvider === 'openai' ? 'gpt-5.4' :
          useProvider === 'perplexity' ? 'sonar-reasoning-pro' :
            useProvider === 'claude' ? 'claude-sonnet-4-5-20250929' :
              'gemini-3-pro-preview');
    }

    console.log(`[Edge Function] Using model: ${useModel} (provider: ${useProvider}, webSearch: ${webSearch}, deepThinking: ${deepThinking})`);

    // Flag to track if we downgraded
    let downgradedFrom: string | null = null;

    // --- MATH OF DEATH: HARD TOKEN LIMITS ---
    if (isHighTier(useProvider, useModel)) {
      if (!isSubscribed && !isAdmin) {
        // --- FALLBACK LOGIC ---
        // Instead of blocking, we downgrade to Gemini Flash (Free)
        console.log(`[Edge Function] Downgrading Free user from ${useModel} to Gemini 3 Flash`);
        downgradedFrom = useModel;
        useProvider = 'gemini';
        useModel = 'gemini-3-flash-preview'; // Fallback to Gemini 3 Flash (Free tier)
      } else {
        // Check Monthly Limit (Skip if Admin)
        if (!isAdmin) {
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
          }
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

      const useOpenAIReasoning = isOpenAIReasoningModel(useModel);
      const response = await fetch(
        useOpenAIReasoning ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            useOpenAIReasoning
              ? {
                  model: useModel,
                  input: openaiMessages,
                  stream: true,
                  reasoning: { effort: 'medium' },
                }
              : {
                  model: useModel,
                  messages: openaiMessages,
                  stream: true,
                }
          ),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ error: `OpenAI error: ${error}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transformStream = new TransformStream({
        reasoningSeen: false,
        reasoningDoneEmitted: false,
        reasoningStart: 0,
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
                if (useOpenAIReasoning) {
                  const eventType = parsed.type;
                  const summaryDelta =
                    parsed.delta?.summary_text ||
                    parsed.delta?.text ||
                    parsed.summary_text ||
                    parsed.reasoning?.summary?.[0]?.text;

                  const isReasoningEvent =
                    typeof summaryDelta === 'string' &&
                    summaryDelta.length > 0 &&
                    (
                      eventType?.includes?.('reasoning') ||
                      eventType === 'response.reasoning_summary_text.delta' ||
                      eventType === 'response.reasoning.delta'
                    );

                  if (isReasoningEvent) {
                    if (!this.reasoningSeen) {
                      this.reasoningSeen = true;
                      this.reasoningStart = Date.now();
                    }
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ reasoning: summaryDelta })}\n\n`));
                    continue;
                  }

                  const content =
                    parsed.delta?.output_text ||
                    parsed.delta?.text ||
                    parsed.output_text ||
                    parsed.response?.output_text ||
                    parsed.choices?.[0]?.delta?.content;
                  if (typeof content === 'string' && content.length > 0) {
                    if (this.reasoningSeen && !this.reasoningDoneEmitted) {
                      const reasoningSeconds = Math.round((Date.now() - this.reasoningStart) / 1000);
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ reasoningDone: true, reasoningSeconds })}\n\n`));
                      this.reasoningDoneEmitted = true;
                    }
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } else {
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
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
          max_tokens: 4096, // Prevent truncation; Perplexity default can cut responses short
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ error: `Perplexity error: ${error}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buffer incomplete SSE chunks; UTF-8 stream decode so bytes split across TCP packets never corrupt text.
      let sseBuffer = '';
      const utf8Decoder = new TextDecoder('utf-8');

      const processSseText = (text: string, controller: { enqueue: (c: Uint8Array) => void }) => {
        sseBuffer += text;
        sseBuffer = sseBuffer.replace(/\r\n/g, '\n');
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;
          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: useModel, provider: 'perplexity' })}\n\n`));
            } else {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (typeof content === 'string' && content.length > 0) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      };

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = utf8Decoder.decode(chunk, { stream: true });
          processSseText(text, controller);
        },
        flush(controller) {
          const tail = utf8Decoder.decode();
          if (tail) processSseText(tail, controller);
          if (sseBuffer.trim()) {
            sseBuffer += '\n\n';
            processSseText('', controller);
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

      // Format for Responses API. Include image on the latest user message when provided.
      const grokInput = [
        { role: 'developer', content: grokSystemPrompt },
        ...messages.map((m, index) => {
          const role = m.role === 'assistant' ? 'assistant' : 'user';
          const isLast = index === messages.length - 1;
          if (isLast && role === 'user' && image?.base64) {
            return {
              role,
              content: [
                { type: 'input_text', text: m.content },
                { type: 'input_image', image_url: `data:${image.mimeType};base64,${image.base64}` },
              ],
            };
          }
          return { role, content: m.content };
        }),
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
        reasoningSeen: false,
        reasoningDoneEmitted: false,
        reasoningStart: 0,
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          const emit = (event: Record<string, unknown>) => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
          };

          const emitReasoning = (reasoningText: string) => {
            if (!reasoningText) return;
            if (!this.reasoningSeen) {
              this.reasoningSeen = true;
              this.reasoningStart = Date.now();
            }
            emit({ reasoning: reasoningText });
          };

          const emitContent = (contentText: string) => {
            if (!contentText) return;
            if (this.reasoningSeen && !this.reasoningDoneEmitted) {
              const reasoningSeconds = Math.round((Date.now() - this.reasoningStart) / 1000);
              emit({ reasoningDone: true, reasoningSeconds });
              this.reasoningDoneEmitted = true;
            }
            emit({ content: contentText });
          };

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              emit({ done: true, model: useModel, provider: 'grok' });
            } else {
              try {
                const parsed = JSON.parse(data);
                const eventType = parsed.type;

                if (eventType === 'response.output_item.added') {
                  const item = parsed.item;
                  if (item?.type === 'tool_use') {
                    const toolName = item.name;
                    let thinkingMessage = '';
                    let query = '';
                    if (item.arguments) {
                      try {
                        const args = JSON.parse(item.arguments);
                        query = args.query || args.search_query || '';
                      } catch {
                        // ignore
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
                    emit({ thinking: thinkingMessage });
                  }
                } else if (
                  eventType === 'response.reasoning.delta' ||
                  eventType === 'response.reasoning_summary_text.delta' ||
                  (typeof eventType === 'string' && eventType.includes('reasoning'))
                ) {
                  const reasoningDelta =
                    parsed.delta?.text ||
                    parsed.delta?.summary_text ||
                    (typeof parsed.delta === 'string' ? parsed.delta : '') ||
                    parsed.summary_text ||
                    parsed.reasoning?.summary?.[0]?.text;
                  if (typeof reasoningDelta === 'string' && reasoningDelta.length > 0) {
                    emitReasoning(reasoningDelta);
                  }
                } else if (eventType === 'response.output_text.delta') {
                  const content = parsed.delta;
                  if (typeof content === 'string' && content.length > 0) {
                    emitContent(content);
                  }
                } else if (eventType === 'response.completed') {
                  const output = parsed.response?.output;
                  if (output && Array.isArray(output)) {
                    for (const item of output) {
                      if (item.type === 'message' && item.content) {
                        for (const part of item.content) {
                          if (part.type === 'text' && part.text) {
                            emitContent(part.text);
                          }
                        }
                      }
                    }
                  }
                  emit({ done: true, model: useModel, provider: 'grok' });
                }

                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (typeof deltaContent === 'string' && deltaContent.length > 0) {
                  emitContent(deltaContent);
                }
              } catch (e) {
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

      const enableAnthropicThinking = supportsAnthropicThinking(useModel) && (deepThinking === true || isOpenAIReasoningModel(useModel));
      const existingAnthropicMaxTokens = 4096;
      const thinkingBudgetTokens = 5000;
      const answerHeadroomTokens = 4000;
      const anthropicMaxTokens = enableAnthropicThinking
        ? Math.max(existingAnthropicMaxTokens, thinkingBudgetTokens + answerHeadroomTokens)
        : existingAnthropicMaxTokens;
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
          max_tokens: anthropicMaxTokens,
          ...(enableAnthropicThinking ? { thinking: { type: 'enabled', budget_tokens: thinkingBudgetTokens } } : {}),
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
        reasoningSeen: false,
        reasoningDoneEmitted: false,
        reasoningStart: 0,
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta') {
                  const deltaType = parsed.delta?.type;
                  if (deltaType === 'thinking_delta') {
                    const reasoningChunk = parsed.delta?.thinking;
                    if (typeof reasoningChunk === 'string' && reasoningChunk.length > 0) {
                      if (!this.reasoningSeen) {
                        this.reasoningSeen = true;
                        this.reasoningStart = Date.now();
                      }
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ reasoning: reasoningChunk })}\n\n`));
                    }
                  } else if (deltaType === 'text_delta') {
                    const content = parsed.delta?.text;
                    if (content) {
                      if (this.reasoningSeen && !this.reasoningDoneEmitted) {
                        const reasoningSeconds = Math.round((Date.now() - this.reasoningStart) / 1000);
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ reasoningDone: true, reasoningSeconds })}\n\n`));
                        this.reasoningDoneEmitted = true;
                      }
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
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

    console.log(`[Edge Function] FINAL GEMINI MODEL: '${useModel.trim()}' (Length: ${useModel.trim().length})`);

    const geminiThinkingEnabled = supportsGeminiThinking(useModel);
    const geminiThinkingBudget = 5000;
    const geminiAnswerHeadroom = 4000;
    const geminiThinkingGenerationConfig = geminiThinkingEnabled
      ? {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: geminiThinkingBudget,
          },
          maxOutputTokens: geminiThinkingBudget + geminiAnswerHeadroom,
        }
      : undefined;

    const model = genAI.getGenerativeModel({
      model: useModel.trim(),
      systemInstruction: systemPrompt,
      tools: tools,
      ...(geminiThinkingGenerationConfig ? { generationConfig: geminiThinkingGenerationConfig } : {}),
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

        // Gemini can inline chain-of-thought as `<think>...</think>` or `<thinking>...</thinking>` blocks
        // inside normal text streams. We split server-side so the client sees a clean two-phase stream
        // (reasoning* -> reasoningDone -> content*) just like Anthropic.
        const THINK_OPEN_RE = /<think(?:ing)?\s*>/i;
        const THINK_CLOSE_RE = /<\/think(?:ing)?\s*>/i;
        const TAG_SAFE_TAIL = 20;

        let tagBuffer = '';
        let insideThink = false;
        let reasoningSeen = false;
        let reasoningDoneEmitted = false;
        let reasoningStart = 0;

        const emit = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        const emitReasoning = (text: string) => {
          if (!text) return;
          if (!reasoningSeen) {
            reasoningSeen = true;
            reasoningStart = Date.now();
          }
          emit({ reasoning: text });
        };

        const emitContent = (text: string) => {
          if (!text) return;
          if (reasoningSeen && !reasoningDoneEmitted) {
            const reasoningSeconds = Math.round((Date.now() - reasoningStart) / 1000);
            emit({ reasoningDone: true, reasoningSeconds });
            reasoningDoneEmitted = true;
          }
          emit({ content: text });
        };

        const feedTextThroughTagParser = (text: string, isFinal: boolean) => {
          if (!text && !isFinal) return;
          tagBuffer += text;

          while (true) {
            if (!insideThink) {
              const match = tagBuffer.match(THINK_OPEN_RE);
              if (!match) {
                if (isFinal) {
                  emitContent(tagBuffer);
                  tagBuffer = '';
                } else {
                  const safeLen = Math.max(0, tagBuffer.length - TAG_SAFE_TAIL);
                  if (safeLen > 0) {
                    emitContent(tagBuffer.slice(0, safeLen));
                    tagBuffer = tagBuffer.slice(safeLen);
                  }
                }
                return;
              }
              const before = tagBuffer.slice(0, match.index ?? 0);
              if (before) emitContent(before);
              tagBuffer = tagBuffer.slice((match.index ?? 0) + match[0].length);
              insideThink = true;
            } else {
              const match = tagBuffer.match(THINK_CLOSE_RE);
              if (!match) {
                if (isFinal) {
                  emitReasoning(tagBuffer);
                  tagBuffer = '';
                } else {
                  const safeLen = Math.max(0, tagBuffer.length - TAG_SAFE_TAIL);
                  if (safeLen > 0) {
                    emitReasoning(tagBuffer.slice(0, safeLen));
                    tagBuffer = tagBuffer.slice(safeLen);
                  }
                }
                return;
              }
              const before = tagBuffer.slice(0, match.index ?? 0);
              if (before) emitReasoning(before);
              tagBuffer = tagBuffer.slice((match.index ?? 0) + match[0].length);
              insideThink = false;
            }
          }
        };

        try {
          for await (const chunk of result.stream) {
            const candidates =
              chunk?.candidates ||
              chunk?.response?.candidates ||
              chunk?.rawResponse?.candidates ||
              [];
            const parts = candidates?.[0]?.content?.parts;

            if (Array.isArray(parts) && parts.length > 0) {
              for (const part of parts) {
                const partText = typeof part?.text === 'string' ? part.text : '';
                if (!partText) continue;

                const isThoughtPart =
                  part?.thought === true || part?.type === 'thought' || part?.role === 'thought';

                if (isThoughtPart) {
                  emitReasoning(partText);
                } else {
                  feedTextThroughTagParser(partText, false);
                }
              }
            } else {
              const text = typeof chunk?.text === 'function' ? chunk.text() : '';
              if (text) feedTextThroughTagParser(text, false);
            }
          }

          feedTextThroughTagParser('', true);

          emit({ done: true, model: useModel, provider: 'gemini' });
          controller.close();
        } catch (error: any) {
          emit({ error: error.message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...(downgradedFrom ? { 'x-model-downgraded-from': downgradedFrom } : {}),
      },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
