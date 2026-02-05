import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

serve(async (req: Request) => {
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

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false }
        })

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'User not authenticated' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

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
    } catch (err) {
        console.error('Checkout error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
