import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';
import { Platform, Linking } from 'react-native';

export function useSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSubscription() {
      if (!user) {
        setIsSubscribed(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_subscribed, subscription_expires_at')
          .eq('id', user.id)
          .maybeSingle();

        // PGRST116 = no rows (profile doesn't exist yet) - this is OK, just not subscribed
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking subscription:', error);
          setIsSubscribed(false);
        } else {
          // Check if subscribed and subscription hasn't expired
          const isActive = data?.is_subscribed === true;
          const expiresAt = data?.subscription_expires_at;
          const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
          setIsSubscribed(isActive && !isExpired);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, [user]);

  return { isSubscribed, isLoading };
}

/**
 * Open Stripe billing portal for the current user.
 * This allows Pro users to cancel/downgrade their subscription.
 */
export async function openBillingPortal(returnUrl?: string): Promise<void> {
  // Ensure we invoke the Edge Function with a fresh user JWT.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Please sign in again to manage your subscription.');
  }

  let { data: sessionData } = await supabase.auth.getSession();
  let accessToken = sessionData.session?.access_token || '';

  // Force refresh once to avoid stale/invalid JWT on web.
  const refreshed = await supabase.auth.refreshSession();
  accessToken = refreshed.data.session?.access_token || accessToken;

  if (!accessToken) {
    throw new Error('Your session expired. Please sign in again.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing.');
  }

  const fallbackReturnUrl =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/profile`
      : 'promptsquad://';

  const response = await fetch(`${supabaseUrl}/functions/v1/create-billing-portal-session`, {
    method: 'POST',
    headers: {
      // Gateway auth (same pattern as secure-chat)
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
      // Actual user auth for the function
      'x-user-token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      returnUrl: returnUrl || fallbackReturnUrl,
    }),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const details = data?.details || data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(details);
  }

  if (!data?.url) {
    throw new Error('No billing portal URL returned');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = data.url;
    return;
  }

  await Linking.openURL(data.url);
}
