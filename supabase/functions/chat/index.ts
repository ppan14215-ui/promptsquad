// Supabase Edge Function for secure AI chat
// This function:
// 1. Verifies user authentication
// 2. Fetches the mascot's hidden system prompt from the database
// 3. Calls the AI provider with the prompt injected
// 4. Streams the response back to the client

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Use latest stable version of Google Generative AI SDK
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';

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
  provider?: string; // Optional AI provider override ('openai' | 'gemini')
  deepThinking?: boolean; // Optional Deep Thinking mode (uses pro models)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log request details for debugging
    console.log('[Edge Function] Method:', req.method);
    console.log('[Edge Function] URL:', req.url);
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

    // Parse request body with error handling
    let requestBody: ChatRequest;
    try {
      const bodyText = await req.text();
      console.log('[Edge Function] Request body length:', bodyText.length);
      requestBody = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error('[Edge Function] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { mascotId, messages, conversationId, skillId, provider: userProviderOverride, deepThinking: deepThinkingEnabled } = requestBody;

    if (!mascotId || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mascotId, messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use mascot ID directly (VARCHAR, not UUID in new schema)
    const mascotIdString = mascotId.toString();

    // Fetch mascot info using VARCHAR ID
    const { data: mascot, error: mascotError } = await supabaseAdmin
      .from('mascots')
      .select('*')
      .eq('id', mascotIdString)
      .single();

    if (mascotError || !mascot) {
      console.error('[Edge Function] Mascot not found:', mascotError);
      return new Response(
        JSON.stringify({ error: 'Mascot not found', details: mascotError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch instructions (system behavior guidelines)
    const { data: instructionsData, error: instructionsError } = await supabaseAdmin
      .from('mascot_instructions')
      .select('instructions')
      .eq('mascot_id', mascotIdString)
      .maybeSingle();
    
    if (instructionsError) {
      console.error('[Edge Function] Error fetching instructions:', instructionsError);
      // Continue without instructions if there's an error
    }

    // Fetch skill prompt if skillId is provided
    // IMPORTANT: Fetch directly from database to get the full prompt (bypasses RPC admin check)
    let skillPrompt = '';
    if (skillId) {
      // Try RPC first (might return null for non-admin users)
      const { data: skillsData } = await supabaseAdmin
        .rpc('get_mascot_skills', { p_mascot_id: mascotIdString });
      
      if (skillsData) {
        const skill = skillsData.find((s: any) => s.id === skillId);
        if (skill?.skill_prompt) {
          skillPrompt = skill.skill_prompt;
        }
      }
      
      // If RPC didn't return the prompt (e.g., for non-admin users), fetch directly from database
      if (!skillPrompt) {
        const { data: skillData, error: skillError } = await supabaseAdmin
          .from('mascot_skills')
          .select('skill_prompt')
          .eq('id', skillId)
          .eq('mascot_id', mascotIdString)
          .single();
        
        if (!skillError && skillData?.skill_prompt) {
          skillPrompt = skillData.skill_prompt;
          console.log('[Edge Function] Fetched skill prompt directly from database for skill:', skillId);
        }
      }
    }

    // Construct system prompt from mascot info and instructions
    // Mascot instructions = personality/behavior (ALWAYS applied)
    // Skill prompt = specific approach for this chat (ADDITIONAL guidance when skill is selected)
    let combinedSystemPrompt = `You are ${mascot.name}, ${mascot.subtitle || 'a helpful AI assistant'}.`;
    
    // MASCOT INSTRUCTIONS (Personality/Behavior - Always True)
    // These define the mascot's personality and should be followed in ALL conversations
    if (instructionsData?.instructions) {
      combinedSystemPrompt = `${combinedSystemPrompt}\n\n---\n\nYOUR PERSONALITY AND BEHAVIOR (Always apply these in every conversation):\n\n${instructionsData.instructions}`;
    } else {
      // Default instructions if none configured
      combinedSystemPrompt = `${combinedSystemPrompt}\n\n---\n\nYOUR PERSONALITY AND BEHAVIOR (Always apply these in every conversation):\n\nYou are friendly, helpful, and thorough. Always provide clear, actionable responses.`;
    }
    
    // SKILL PROMPT (Specific Approach - Additional instructions for this chat)
    // These are specific instructions for the selected skill and should be followed EXACTLY
    // The skill prompt should be followed throughout the entire conversation
    // It may ask for information step-by-step, which should be maintained across all messages
    if (skillPrompt) {
      combinedSystemPrompt = `${combinedSystemPrompt}\n\n---\n\nCRITICAL: SKILL-SPECIFIC INSTRUCTIONS (FOLLOW THESE THROUGHOUT THE ENTIRE CONVERSATION):\n\n${skillPrompt}\n\nIMPORTANT: These skill instructions define how you should behave throughout this entire conversation. Your personality from above still applies, but these skill instructions determine your approach, methodology, response style, and the questions you should ask. Follow these instructions step-by-step as written. If the instructions specify asking for information one step at a time, maintain that approach across all messages. Continue following these instructions for every message in this conversation.`;
    }

    // Check if user has access to this mascot (free or unlocked)
    // First, check if user is an admin (admins have access to all mascots)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_subscribed, subscription_expires_at')
      .eq('id', user.id)
      .maybeSingle();

    // If profile doesn't exist, create a basic one (non-admin, not subscribed)
    const isAdmin = userProfile?.role === 'admin' || false;
    const isSubscribed = userProfile?.is_subscribed === true && 
      (!userProfile.subscription_expires_at || new Date(userProfile.subscription_expires_at) > new Date());

    // Free mascots are accessible to everyone
    if (!mascot.is_free && !isAdmin) {
      const { data: userMascot } = await supabaseAdmin
        .from('user_mascots')
        .select('id')
        .eq('user_id', user.id)
        .eq('mascot_id', mascotIdString)
        .maybeSingle();

      if (!userMascot && !isSubscribed) {
        return new Response(
          JSON.stringify({ error: 'Mascot not unlocked. Please purchase or subscribe.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get AI provider credentials
    // Note: Supabase secrets are case-sensitive, use the exact name from secrets list
    // Secret is named "Gemini_API_KEY" (not "GEMINI_API_KEY")
    // In Supabase Edge Functions, secrets are available via Deno.env.get()
    const geminiApiKey = Deno.env.get('Gemini_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Debug logging for API keys (don't log the actual key values)
    console.log('[Edge Function] Gemini API key exists:', !!geminiApiKey);
    console.log('[Edge Function] OpenAI API key exists:', !!openaiApiKey);
    console.log('[Edge Function] User provider override:', userProviderOverride || 'none');

    // Provider selection priority:
    // 1. User override (if provided)
    // 2. Mascot's ai_provider (if configured)
    // 3. System default (OpenAI if available, else Gemini)
    let aiProvider: string;
    let aiModel: string;
    
    if (userProviderOverride && (userProviderOverride === 'openai' || userProviderOverride === 'gemini')) {
      // User explicitly chose a provider
      aiProvider = userProviderOverride;
      console.log('[Edge Function] Using user-provided provider:', aiProvider);
    } else if ((mascot as any).ai_provider && ((mascot as any).ai_provider === 'openai' || (mascot as any).ai_provider === 'gemini')) {
      // Use mascot's configured provider
      aiProvider = (mascot as any).ai_provider;
      console.log('[Edge Function] Using mascot-configured provider:', aiProvider);
    } else {
      // System default: prefer OpenAI if available, else Gemini
      aiProvider = openaiApiKey ? 'openai' : 'gemini';
      console.log('[Edge Function] Using system default provider:', aiProvider, openaiApiKey ? '(OpenAI key available)' : '(OpenAI key not available, using Gemini)');
    }
    
    // Set the model based on the selected provider and Deep Thinking mode
    // Deep Thinking uses pro models: gpt-4o (OpenAI) or gemini-1.5-pro (Gemini)
    // Normal mode uses light models: gpt-4o-mini (OpenAI) or gemini-1.5-flash (Gemini)
    if (aiProvider === 'openai') {
      aiModel = deepThinkingEnabled 
        ? 'gpt-4o' // Deep Thinking: use pro model
        : (mascot as any).ai_model || 'gpt-4o-mini'; // Normal: use light model
      if (!openaiApiKey) {
        console.error('[Edge Function] OpenAI provider selected but API key not configured');
        return new Response(
          JSON.stringify({ error: 'OpenAI API key not configured. Please use Gemini or configure OpenAI.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Gemini models
      aiModel = deepThinkingEnabled 
        ? 'gemini-1.5-pro' // Deep Thinking: use pro model
        : 'gemini-1.5-flash'; // Normal: use light model
      if (!geminiApiKey) {
        console.error('[Edge Function] Gemini provider selected but API key not configured');
        return new Response(
          JSON.stringify({ error: 'Gemini API key not configured. Please use OpenAI or configure Gemini.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    console.log('[Edge Function] Deep Thinking mode:', deepThinkingEnabled || false, '- Using model:', aiModel);
    
    console.log('[Edge Function] Final provider:', aiProvider, 'Model:', aiModel);

    const geminiModel = aiModel; // Use the same model we selected above

    // Route to appropriate AI provider
    if (aiProvider === 'gemini' || !aiProvider || aiProvider === '') {
      if (!geminiApiKey) {
        console.error('[Edge Function] Gemini API key not configured');
        return new Response(
          JSON.stringify({ error: 'Gemini API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        console.log('[Edge Function] Initializing Gemini with model:', geminiModel);
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        
        // Use the selected Gemini model (gemini-1.5-flash by default)
        // gemini-1.5-flash is stable and widely available
        const model = genAI.getGenerativeModel({ 
          model: geminiModel,
          systemInstruction: combinedSystemPrompt,
        });
        
        console.log('[Edge Function] Model initialized successfully:', geminiModel);

        // Convert messages to Gemini format
        // Gemini requires: first message must be from user, alternating user/model pattern
        // Filter and convert messages, ensuring we start with a user message
        const geminiHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        
        // Process all messages except the last one (which we'll send separately)
        for (let i = 0; i < messages.length - 1; i++) {
          const msg = messages[i];
          // Skip any non-user/non-assistant messages
          if (msg.role !== 'user' && msg.role !== 'assistant') continue;
          
          // Convert to Gemini format
          const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
          
          // Ensure we start with a user message
          if (geminiHistory.length === 0 && geminiRole !== 'user') {
            // Skip this message if it's not a user message and history is empty
            continue;
          }
          
          geminiHistory.push({
            role: geminiRole,
            parts: [{ text: msg.content }],
          });
        }

        const lastMessage = messages[messages.length - 1];
        console.log('[Edge Function] Starting chat with history length:', geminiHistory.length);
        console.log('[Edge Function] Last message role:', lastMessage.role);
        console.log('[Edge Function] Last message:', lastMessage.content.substring(0, 100) + '...');
        
        // Ensure last message is from user (required by Gemini)
        if (lastMessage.role !== 'user') {
          console.error('[Edge Function] Last message must be from user, got:', lastMessage.role);
          return new Response(
            JSON.stringify({ error: 'Last message must be from user' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const chat = model.startChat({ history: geminiHistory });

        // Stream the response
        console.log('[Edge Function] Sending message to Gemini...');
        const result = await chat.sendMessageStream(lastMessage.content);
        console.log('[Edge Function] Got response stream from Gemini');

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
            
            // Send completion signal with provider info
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, model: geminiModel, provider: 'gemini' })}\n\n`));
            controller.close();
          } catch (streamError: any) {
            console.error('[Edge Function] Stream error:', streamError);
            const errorMessage = streamError?.message || streamError?.toString() || 'Stream error occurred';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
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
      } catch (geminiError: any) {
        console.error('[Edge Function] Gemini API error:', geminiError);
        console.error('[Edge Function] Gemini error stack:', geminiError?.stack);
        console.error('[Edge Function] Gemini error code:', geminiError?.code);
        console.error('[Edge Function] Gemini error status:', geminiError?.status);
        const errorMessage = geminiError?.message || geminiError?.toString() || 'Unknown Gemini API error';
        return new Response(
          JSON.stringify({ 
            error: 'Gemini API error',
            details: errorMessage,
            code: geminiError?.code,
            status: geminiError?.status
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else if (aiProvider === 'openai') {
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
          model: aiModel,
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
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model: aiModel, provider: 'openai' })}\n\n`));
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
        JSON.stringify({ error: `Unsupported AI provider: ${aiProvider}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[Edge Function] Chat function error:', error);
    console.error('[Edge Function] Error stack:', error.stack);
    console.error('[Edge Function] Error message:', error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        type: error.name || 'Error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

