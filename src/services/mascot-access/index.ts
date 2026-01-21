import React from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';
import { logger } from '@/lib/utils/logger';

export type UserMascot = {
  id: string;
  user_id: string;
  mascot_id: string;
  created_at: string;
};

/**
 * Get all unlocked mascot IDs for the current user
 */
export async function getUnlockedMascots(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_mascots')
    .select('mascot_id')
    .eq('user_id', user.id);

  if (error) {
    // Self-healing: If unauthorized (401) or Not Acceptable (406 - often auth related), force sign out
    if (error.code === '401' || error.code === '406' || (error as any).status === 401 || (error as any).status === 406) {
      logger.error('Auth error in getUnlockedMascots, forcing sign out:', error);
      await supabase.auth.signOut();
      return [];
    }

    logger.error('Error fetching unlocked mascots:', error);
    return [];
  }

  return data?.map((m) => m.mascot_id) || [];
}

/**
 * Check if a specific mascot is unlocked for the current user
 */
export async function isMascotUnlocked(mascotId: string): Promise<boolean> {
  const unlocked = await getUnlockedMascots();
  return unlocked.includes(mascotId);
}

/**
 * Unlock mascots for the current user (used during onboarding)
 */
export async function unlockMascots(mascotIds: string[]): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.error('unlockMascots: User not authenticated');
    return { error: new Error('User not authenticated') };
  }

  if (!mascotIds || mascotIds.length === 0) {
    logger.error('unlockMascots: No mascots provided');
    return { error: new Error('No mascots selected') };
  }

  logger.debug('unlockMascots: Unlocking mascots:', mascotIds, 'for user:', user.id);

  // First, delete any existing unlocked mascots for this user (in case of re-onboarding)
  const { error: deleteError } = await supabase
    .from('user_mascots')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    logger.error('Error deleting existing unlocked mascots:', deleteError);
    // Continue anyway - might be first time
  }

  // Insert unlocked mascots
  const records = mascotIds.map((mascotId) => ({
    user_id: user.id,
    mascot_id: mascotId,
  }));

  const { data: insertData, error: insertError } = await supabase
    .from('user_mascots')
    .insert(records)
    .select();

  if (insertError) {
    logger.error('Error unlocking mascots:', insertError);
    logger.error('Insert error details:', JSON.stringify(insertError, null, 2));
    return { error: new Error(insertError.message || 'Failed to unlock mascots') };
  }

  logger.debug('unlockMascots: Successfully inserted mascots:', insertData);

  // Mark onboarding as completed (use upsert in case profile doesn't exist)
  const { error: updateError } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id, 
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'id' 
    });

  if (updateError) {
    logger.error('Error updating onboarding status:', updateError);
    // Don't fail the whole operation if this fails - mascots are already unlocked
    logger.warn('Warning: Mascots unlocked but onboarding status not updated');
  } else {
    logger.debug('unlockMascots: Onboarding marked as completed');
  }

  // Verify the unlock worked
  const unlocked = await getUnlockedMascots();
  logger.debug('unlockMascots: Verified unlocked mascots:', unlocked);

  return { error: null };
}

/**
 * Check if the current user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    // PGRST116 = no rows (profile doesn't exist yet) - treat as not completed
    if (error && error.code !== 'PGRST116') {
      // Self-healing: If unauthorized, force sign out
      if (error.code === '401' || error.code === '406' || (error as any).status === 401 || (error as any).status === 406) {
        logger.error('Auth error in hasCompletedOnboarding, forcing sign out:', error);
        await supabase.auth.signOut();
        return false;
      }

      logger.error('Error checking onboarding status:', error);
      // Fallback: check if user has any unlocked mascots
      const unlocked = await getUnlockedMascots();
      return unlocked.length > 0;
    }

    return data?.onboarding_completed || false;
  } catch (err) {
    logger.error('Error in hasCompletedOnboarding:', err);
    // Fallback: check if user has any unlocked mascots
    const unlocked = await getUnlockedMascots();
    return unlocked.length > 0;
  }
}

/**
 * React hook to get unlocked mascot IDs
 */
export function useUnlockedMascots(): { unlockedMascotIds: string[]; isLoading: boolean } {
  const { user } = useAuth();
  const [unlockedMascotIds, setUnlockedMascotIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchUnlocked() {
      if (!user) {
        setUnlockedMascotIds([]);
        setIsLoading(false);
        return;
      }

      const unlocked = await getUnlockedMascots();
      setUnlockedMascotIds(unlocked);
      setIsLoading(false);
    }

    fetchUnlocked();
  }, [user]);

  return { unlockedMascotIds, isLoading };
}

export type TrialUsage = {
  conversationCount: number;
  limitReached: boolean;
};

const TRIAL_LIMIT = 5;

/**
 * Get trial usage for a specific mascot
 */
export async function getTrialUsage(mascotId: string): Promise<TrialUsage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { conversationCount: 0, limitReached: false };
  }

  const { data, error } = await supabase
    .from('trial_usage')
    .select('conversation_count')
    .eq('user_id', user.id)
    .eq('mascot_id', mascotId)
    .single();

  if (error) {
    // If no record exists, return 0
    if (error.code === 'PGRST116') {
      return { conversationCount: 0, limitReached: false };
    }
    logger.error('Error fetching trial usage:', error);
    return { conversationCount: 0, limitReached: false };
  }

  const conversationCount = data?.conversation_count || 0;
  return {
    conversationCount,
    limitReached: conversationCount >= TRIAL_LIMIT,
  };
}

/**
 * Increment trial usage for a mascot (called when starting a new conversation)
 */
export async function incrementTrialUsage(mascotId: string): Promise<{ error: Error | null; usage: TrialUsage | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('User not authenticated'), usage: null };
  }

  const { data, error } = await supabase.rpc('increment_trial_usage', {
    p_mascot_id: mascotId,
  });

  if (error) {
    logger.error('Error incrementing trial usage:', error);
    return { error: new Error(error.message), usage: null };
  }

  if (!data || data.length === 0) {
    return { error: new Error('No data returned from increment_trial_usage'), usage: null };
  }

  const result = data[0];
  return {
    error: null,
    usage: {
      conversationCount: result.conversation_count,
      limitReached: result.limit_reached,
    },
  };
}

/**
 * Check if a user can use a mascot (unlocked, trial available, or locked)
 */
export async function canUseMascot(mascotId: string): Promise<{
  canUse: boolean;
  reason: 'unlocked' | 'trial' | 'trial_exhausted' | 'locked';
  trialCount?: number;
  trialLimit?: number;
}> {
  const isUnlocked = await isMascotUnlocked(mascotId);
  
  if (isUnlocked) {
    return { canUse: true, reason: 'unlocked' };
  }

  // Check trial usage
  const trialUsage = await getTrialUsage(mascotId);
  
  if (trialUsage.limitReached) {
    return {
      canUse: false,
      reason: 'trial_exhausted',
      trialCount: trialUsage.conversationCount,
      trialLimit: TRIAL_LIMIT,
    };
  }

  if (trialUsage.conversationCount < TRIAL_LIMIT) {
    return {
      canUse: true,
      reason: 'trial',
      trialCount: trialUsage.conversationCount,
      trialLimit: TRIAL_LIMIT,
    };
  }

  return { canUse: false, reason: 'locked' };
}

/**
 * React hook to get mascot access status
 */
export function useMascotAccess(mascotId: string | null): {
  canUse: boolean;
  reason: 'unlocked' | 'trial' | 'trial_exhausted' | 'locked';
  trialCount: number;
  trialLimit: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [canUse, setCanUse] = React.useState(false);
  const [reason, setReason] = React.useState<'unlocked' | 'trial' | 'trial_exhausted' | 'locked'>('locked');
  const [trialCount, setTrialCount] = React.useState(0);
  const [trialLimit] = React.useState(TRIAL_LIMIT);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const checkAccess = React.useCallback(async () => {
    if (!user || !mascotId) {
      setCanUse(false);
      setReason('locked');
      setTrialCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const access = await canUseMascot(mascotId);
    setCanUse(access.canUse);
    setReason(access.reason);
    setTrialCount(access.trialCount || 0);
    setIsLoading(false);
  }, [user, mascotId]);

  React.useEffect(() => {
    checkAccess();
  }, [checkAccess, refreshTrigger]);

  const refresh = React.useCallback(async () => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { canUse, reason, trialCount, trialLimit, isLoading, refresh };
}
