// Minimal chat function to debug auth issues
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // Use Anon key first

        // Get Token
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

        console.log('[Chat V2] Token received:', token ? 'Yes' : 'No');
        console.log('[Chat V2] Token length:', token?.length);

        // 1. SIMPLE VALIDATION - Just check with Anon Key (Client-style)
        const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
            global: { headers: { Authorization: authHeader! } }
        });

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.error('[Chat V2] Auth failed:', error);
            return new Response(JSON.stringify({
                error: 'Auth failed',
                details: error?.message,
                supabaseUrl: supabaseUrl?.substring(0, 20)
            }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
            message: 'Auth successful',
            user: user.id
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
