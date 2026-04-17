/** CORS for browser → Edge Function. Preflight must list every custom header the client sends. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-user-token, prefer, accept, accept-language',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'x-model-downgraded-from',
};
