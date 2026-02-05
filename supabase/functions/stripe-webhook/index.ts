import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.text()
        const signature = req.headers.get('stripe-signature')

        if (!signature) {
            return new Response('No signature', { status: 400, headers: corsHeaders })
        }

        // Verify webhook signature
        let event: Stripe.Event
        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
        } catch (err) {
            console.error('Webhook signature verification failed:', err)
            return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders })
        }

        console.log(`Received event: ${event.type}`)

        // Initialize Supabase admin client
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const userId = session.client_reference_id
                const customerId = session.customer as string
                const subscriptionId = session.subscription as string
                const mode = session.mode
                const metadata = session.metadata || {}

                if (!userId) {
                    console.error('No user ID in checkout session')
                    break
                }

                console.log(`Checkout completed for user ${userId}. Mode: ${mode}`)

                if (mode === 'subscription') {
                    // Update user profile with Stripe IDs and subscription status
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            is_subscribed: true,
                            subscription_status: 'active',
                            subscription_expires_at: null, // Will be set by subscription.updated
                        })
                        .eq('id', userId)

                    if (error) {
                        console.error('Error updating profile:', error)
                    } else {
                        console.log(`User ${userId} successfully upgraded to Pro`)
                    }
                } else if (mode === 'payment' && metadata.type === 'mascot_purchase') {
                    // Handle one-time mascot purchase
                    const mascotId = metadata.mascot_id
                    const paymentId = session.payment_intent as string

                    if (!mascotId) {
                        console.error('No mascot_id in metadata for mascot purchase')
                        break
                    }

                    console.log(`Processing one-time purchase for mascot ${mascotId}`)

                    const { error } = await supabase
                        .from('user_owned_mascots')
                        .insert({
                            user_id: userId,
                            mascot_id: mascotId,
                            stripe_payment_id: paymentId
                        })

                    if (error) {
                        console.error('Error inserting user_owned_mascot:', error)
                    } else {
                        console.log(`User ${userId} successfully purchased mascot ${mascotId}`)
                    }

                    // Also check if we need to update stripe_customer_id in case it was a new customer
                    if (customerId) {
                        await supabase
                            .from('profiles')
                            .update({ stripe_customer_id: customerId })
                            .eq('id', userId)
                            .is('stripe_customer_id', null) // Only update if null
                    }

                } else {
                    console.log(`Unhandled session mode: ${mode} or metadata type`)
                }

                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const customerId = subscription.customer as string
                const status = subscription.status

                console.log(`Subscription updated for customer ${customerId}: ${status}`)

                // Calculate expiry date
                const expiresAt = subscription.current_period_end
                    ? new Date(subscription.current_period_end * 1000).toISOString()
                    : null

                // Update subscription status
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        is_subscribed: status === 'active' || status === 'trialing',
                        subscription_status: status,
                        subscription_expires_at: expiresAt,
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) {
                    console.error('Error updating subscription:', error)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const customerId = subscription.customer as string

                console.log(`Subscription canceled for customer ${customerId}`)

                // Revoke subscription
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        is_subscribed: false,
                        subscription_status: 'canceled',
                        stripe_subscription_id: null,
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) {
                    console.error('Error canceling subscription:', error)
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                const customerId = invoice.customer as string

                console.log(`Payment failed for customer ${customerId}`)

                // Mark as past due
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        subscription_status: 'past_due',
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) {
                    console.error('Error updating payment status:', error)
                }
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error('Webhook error:', err)
        return new Response(`Webhook Error: ${err.message}`, {
            status: 500,
            headers: corsHeaders,
        })
    }
})
