import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const customAuth = req.headers.get('x-user-token')
    const authHeader = req.headers.get('Authorization')
    if (!customAuth && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = customAuth
      ? customAuth.trim()
      : (authHeader || '').replace(/^Bearer\s+/i, '').trim()
    const bearerForSupabase = `Bearer ${token}`

    if (!token || token.split('.').length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT', details: 'Missing or malformed access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: bearerForSupabase } },
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { returnUrl } = await req.json().catch(() => ({ returnUrl: undefined }))
    const finalReturnUrl = returnUrl || `${req.headers.get('origin') || ''}/`

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Could not load user profile', details: profileError?.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let customerId = profile.stripe_customer_id as string | null

    // Backfill customer id for older accounts where this was not stored yet.
    if (!customerId) {
      let existingCustomer: Stripe.Customer | null = null
      const customerSearch = await stripe.customers.search({
        query: `metadata['supabase_user_id']:'${user.id}'`,
        limit: 1,
      }).catch(() => null)

      if (customerSearch?.data?.length) {
        existingCustomer = customerSearch.data[0] as Stripe.Customer
      } else if (user.email) {
        const byEmail = await stripe.customers.list({ email: user.email, limit: 1 }).catch(() => null)
        if (byEmail?.data?.length) {
          existingCustomer = byEmail.data[0] as Stripe.Customer
        }
      }

      if (existingCustomer?.id) {
        customerId = existingCustomer.id
      } else {
        const created = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { supabase_user_id: user.id },
        })
        customerId = created.id
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (updateError) {
        console.warn('[BillingPortal] Failed to backfill stripe_customer_id:', updateError.message)
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId!,
      return_url: finalReturnUrl,
    })

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
