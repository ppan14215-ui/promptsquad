// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const defaultPriceId = Deno.env.get('STRIPE_PRICE_ID') || ''

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get user from JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Extract the JWT token from "Bearer <token>"
        const token = authHeader.replace('Bearer ', '')

        // Create a Supabase client and validate the user's JWT directly
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false }
        })

        // Pass token directly to getUser — most reliable method
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)
        if (userError || !user) {
            console.error('[Checkout] Auth failed:', userError?.message, 'Token length:', token?.length, 'Supabase URL:', supabaseUrl?.substring(0, 30));
            return new Response(
                JSON.stringify({
                    error: 'User not authenticated',
                    details: userError?.message || 'Session may have expired. Please sign in again.'
                }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[Checkout] Auth success for user:', user.id, user.email);

        // Parse request body
        const { successUrl, cancelUrl, priceId, mode = 'subscription', metadata = {} } = await req.json()
        const finalPriceId = priceId || defaultPriceId

        if (!finalPriceId) {
            return new Response(
                JSON.stringify({ error: 'Price ID not provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if user already has a Stripe customer ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', user.id)
            .single()

        let customerId = profile?.stripe_customer_id

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            })
            customerId = customer.id

            // Save customer ID to profile
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        // Prepare session config
        const sessionConfig: any = {
            customer: customerId,
            client_reference_id: user.id,
            line_items: [
                {
                    price: finalPriceId,
                    quantity: 1,
                },
            ],
            mode: mode,
            success_url: successUrl || `${req.headers.get('origin')}/upgrade-success`,
            cancel_url: cancelUrl || `${req.headers.get('origin')}/`,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: {
                supabase_user_id: user.id,
                ...metadata, // Pass through metadata (e.g. mascot_id)
            }
        }

        // Subscription specific config
        if (mode === 'subscription') {
            sessionConfig.subscription_data = {
                metadata: { supabase_user_id: user.id },
            }
        } else {
            // One-time payment specific config
            sessionConfig.payment_intent_data = {
                metadata: {
                    supabase_user_id: user.id,
                    ...metadata
                },
            }
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create(sessionConfig)

        return new Response(
            JSON.stringify({ url: session.url, sessionId: session.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err: any) {
        console.error('Checkout error:', err)
        return new Response(
            JSON.stringify({
                error: err.message || 'Internal Server Error',
                details: err.stack,
                context: 'create-checkout-session catch block'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
