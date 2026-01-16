import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

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
          .single();

        if (error) {
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
