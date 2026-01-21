import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';
import { logger } from '@/lib/utils/logger';

// Types
export type MascotSkill = {
  id: string;
  mascot_id: string;
  skill_label: string;
  skill_prompt: string | null; // Full prompt (only for admins)
  skill_prompt_preview: string; // 25% preview (for everyone)
  is_full_access: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MascotPersonality = {
  id: string;
  mascot_id: string;
  personality: string;
  default_personality?: string | null;
  created_at: string;
  updated_at: string;
};

export type MascotBasic = {
  id: string;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  color: string;
  question_prompt?: string | null;
  sort_order?: number;
  is_free?: boolean;
};

export type SkillQuestion = {
  id: string;
  label: string;
  type: 'text' | 'choice';
  required: boolean;
  choices?: string[];
  placeholder?: string;
};

export type SkillQuestionsConfig = {
  skillId: string;
  questions: SkillQuestion[];
};

// Hook to check if current user is admin
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // PGRST116 = no rows (profile doesn't exist yet) - this is OK, just not admin
        if (error && error.code !== 'PGRST116') {
          logger.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.role === 'admin');
        }
      } catch (err) {
        logger.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, [user]);

  return { isAdmin, isLoading };
}

// Hook to get all mascots
export function useMascots() {
  const [mascots, setMascots] = useState<MascotBasic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMascots() {
      try {
        const { data, error } = await supabase
          .from('mascots')
          .select('id, name, subtitle, image_url, color, question_prompt, sort_order, is_free')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          // Self-healing: If unauthorized, force sign out
          if (error.code === '401' || error.code === '406' || (error as any).status === 401 || (error as any).status === 406) {
            logger.error('Auth error in fetchMascots, forcing sign out:', error);
            await supabase.auth.signOut();
            return;
          }

          setError(error.message);
          setMascots([]);
        } else {
          setMascots(data || []);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message);
        setMascots([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMascots();
  }, []);

  return { mascots, isLoading, error };
}

// Hook to get skills for a mascot
export function useMascotSkills(mascotId: string | null) {
  const [skills, setSkills] = useState<MascotSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!mascotId) {
      setSkills([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      logger.debug('[useMascotSkills] Fetching skills for mascot:', mascotId);
      const { data, error } = await supabase.rpc('get_mascot_skills', {
        p_mascot_id: mascotId,
      });

      if (error) {
        logger.error('[useMascotSkills] RPC error:', error);
        // Code 42883 = function does not exist (RPC not deployed)
        if (error.code === '42883') {
          setSkills([]);
          setError(null);
        } else {
          setError(error.message);
          setSkills([]);
        }
      } else {
        logger.debug('[useMascotSkills] Fetched skills:', data?.length || 0, 'skills');
        setSkills(data || []);
        setError(null);
      }
    } catch (err: any) {
      logger.error('[useMascotSkills] Exception:', err);
      setError(err.message);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }, [mascotId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Create a refetch function that forces a fresh fetch
  const refetch = useCallback(async () => {
    logger.debug('[useMascotSkills] Refetch called for mascot:', mascotId);
    await fetchSkills();
  }, [fetchSkills, mascotId]);

  return { skills, isLoading, error, refetch };
}

// Hook to get personality for a mascot
export function useMascotPersonality(mascotId: string | null) {
  const [personality, setPersonality] = useState<MascotPersonality | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonality = useCallback(async () => {
    if (!mascotId) {
      setPersonality(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mascot_personality')
        .select('*')
        .eq('mascot_id', mascotId)
        .single();

      // PGRST116 = no rows returned, 42P01 = table doesn't exist
      if (error && error.code !== 'PGRST116') {
        if (error.code === '42P01') {
          setPersonality(null);
          setError(null);
        } else {
          setError(error.message);
          setPersonality(null);
        }
      } else {
        setPersonality(data || null);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      setPersonality(null);
    } finally {
      setIsLoading(false);
    }
  }, [mascotId]);

  useEffect(() => {
    fetchPersonality();
  }, [fetchPersonality]);

  return { personality, isLoading, error, refetch: fetchPersonality };
}

// Legacy alias for backward compatibility (deprecated)
export const useMascotInstructions = useMascotPersonality;

// Admin CRUD operations for skills
export async function createSkill(
  mascotId: string,
  skillLabel: string,
  skillPrompt: string,
  sortOrder: number = 0
): Promise<MascotSkill> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  logger.debug('[Admin] Creating skill for mascot:', mascotId, 'label:', skillLabel);

  const { data, error } = await supabase
    .from('mascot_skills')
    .insert({
      mascot_id: mascotId,
      skill_label: skillLabel,
      skill_prompt: skillPrompt,
      sort_order: sortOrder,
      is_active: true, // Ensure new skills are active by default
    })
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Error creating skill:', error);
    throw new Error(error.message || 'Failed to create skill');
  }
  
  logger.debug('[Admin] Skill created successfully:', data);
  return data;
}

export async function updateSkill(
  skillId: string,
  updates: { skill_label?: string; skill_prompt?: string; sort_order?: number; is_active?: boolean }
): Promise<MascotSkill> {
  logger.debug('[Admin] Updating skill:', skillId, 'with updates:', updates);
  
  const { data, error } = await supabase
    .from('mascot_skills')
    .update({
      ...updates,
      updated_at: new Date().toISOString(), // Ensure updated_at is set
    })
    .eq('id', skillId)
    .select()
    .single();

  if (error) {
    logger.error('[Admin] Error updating skill:', error);
    throw new Error(error.message || 'Failed to update skill');
  }
  
  logger.debug('[Admin] Skill updated successfully:', data);
  return data;
}

export async function deleteSkill(skillId: string): Promise<void> {
  const { error } = await supabase
    .from('mascot_skills')
    .delete()
    .eq('id', skillId);

  if (error) throw new Error(error.message);
}

// Update mascot details
export async function updateMascot(
  mascotId: string,
  updates: {
    name?: string;
    subtitle?: string | null;
    image_url?: string | null;
    color?: string;
    question_prompt?: string | null;
    sort_order?: number;
    is_free?: boolean;
  }
): Promise<MascotBasic> {
  const { data, error } = await supabase
    .from('mascots')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mascotId)
    .select('id, name, subtitle, image_url, color, question_prompt, sort_order, is_free')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Admin CRUD operations for personality
// When admin sets personality, both personality and default_personality are set
export async function upsertPersonality(
  mascotId: string,
  personality: string
): Promise<MascotPersonality> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  // Check if default_personality column exists by trying to query it
  // If it doesn't exist, we'll only set personality
  const upsertData: any = {
    mascot_id: mascotId,
    personality,
  };

  // Try to include default_personality, but don't fail if column doesn't exist
  // We'll check by attempting the upsert and handling the error
  try {
    const upsertWithDefault: any = {
      ...upsertData,
      default_personality: personality, // Admin sets both when creating/updating
    };

    const { data, error } = await ((supabase
      .from('mascot_personality') as any)
      .upsert(upsertWithDefault, {
        onConflict: 'mascot_id',
      })
      .select()
      .single());

    if (error) {
      // If error is about default_personality column not existing, try without it
      if (error.message?.includes('default_personality') || error.code === 'PGRST204') {
        logger.warn('[Admin] default_personality column not found, upserting without it');
        const { data: dataWithoutDefault, error: errorWithoutDefault } = await ((supabase
          .from('mascot_personality') as any)
          .upsert(upsertData, {
            onConflict: 'mascot_id',
          })
          .select()
          .single());

        if (errorWithoutDefault) {
          logger.error('[Admin] Error upserting personality:', errorWithoutDefault);
          throw new Error(errorWithoutDefault.message || 'Failed to save personality');
        }
        
        if (!dataWithoutDefault) {
          throw new Error('No data returned from upsert');
        }
        
        return dataWithoutDefault;
      }
      
      logger.error('[Admin] Error upserting personality:', error);
      throw new Error(error.message || 'Failed to save personality');
    }
    
    if (!data) {
      throw new Error('No data returned from upsert');
    }
    
    return data;
  } catch (err: any) {
    // Fallback: try without default_personality
    if (err.message?.includes('default_personality') || err.code === 'PGRST204') {
      logger.warn('[Admin] Retrying upsert without default_personality column');
      const { data: fallbackData, error: fallbackError } = await ((supabase
        .from('mascot_personality') as any)
        .upsert(upsertData, {
          onConflict: 'mascot_id',
        })
        .select()
        .single());

      if (fallbackError) {
        logger.error('[Admin] Error upserting personality (fallback):', fallbackError);
        throw new Error(fallbackError.message || 'Failed to save personality');
      }
      
      if (!fallbackData) {
        throw new Error('No data returned from upsert');
      }
      
      return fallbackData;
    }
    
    throw err;
  }
}

// Update personality (for all users - doesn't change default_personality)
export async function updatePersonality(
  mascotId: string,
  personality: string
): Promise<MascotPersonality> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  const updateData: any = { personality };

  const { data, error } = await ((supabase
    .from('mascot_personality') as any)
    .update(updateData)
    .eq('mascot_id', mascotId)
    .select()
    .single());

  if (error) {
    logger.error('[Admin] Error updating personality:', error);
    throw new Error(error.message || 'Failed to update personality');
  }
  
  if (!data) {
    throw new Error('No data returned from update');
  }
  
  return data;
}

// Reset personality to default (for all users)
export async function resetPersonalityToDefault(
  mascotId: string
): Promise<MascotPersonality> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  // Get the current personality to find default_personality
  const { data: current, error: fetchError } = await supabase
    .from('mascot_personality')
    .select('default_personality')
    .eq('mascot_id', mascotId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // Use default_personality if available, otherwise keep current personality
  const defaultPersonality = current?.default_personality || current?.personality || '';

  const { data, error } = await supabase
    .from('mascot_personality')
    .update({ personality: defaultPersonality })
    .eq('mascot_id', mascotId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Legacy aliases for backward compatibility (deprecated)
export const upsertInstructions = upsertPersonality;
export const updateInstructions = updatePersonality;
export const resetInstructionsToDefault = resetPersonalityToDefault;

// Get combined prompt for chat (personality + skill prompt)
export async function getCombinedPrompt(
  mascotId: string,
  skillId: string
): Promise<{ personality: string; skillPrompt: string; combined: string }> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  // Fetch personality
  const { data: personalityData, error: personalityError } = await supabase
    .from('mascot_personality')
    .select('personality')
    .eq('mascot_id', mascotId)
    .single();

  if (personalityError && personalityError.code !== 'PGRST116') {
    throw new Error(personalityError.message);
  }

  // Fetch skill (using RPC to get full prompt for admins)
  const { data: skillsData, error: skillsError } = await supabase.rpc('get_mascot_skills', {
    p_mascot_id: mascotId,
  });

  if (skillsError) throw new Error(skillsError.message);

  const skill = (skillsData || []).find((s: MascotSkill) => s.id === skillId);
  if (!skill) throw new Error('Skill not found');

  // For non-admins, skill_prompt will be null - use preview or throw
  const skillPrompt = skill.skill_prompt || skill.skill_prompt_preview;
  const personality = personalityData?.personality || '';

  // Combine: personality first, then skill prompt
  const combined = personality 
    ? `${personality}\n\n---\n\n${skillPrompt}`
    : skillPrompt;

  return {
    personality,
    skillPrompt,
    combined,
  };
}

// Get skill by ID (for chat integration)
export async function getSkillById(
  mascotId: string,
  skillId: string
): Promise<MascotSkill | null> {
  if (!mascotId) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_mascot_skills', {
    p_mascot_id: mascotId,
  });

  if (error) {
    return null;
  }

  return (data || []).find((s: MascotSkill) => s.id === skillId) || null;
}
