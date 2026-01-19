import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

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

export type MascotInstructions = {
  id: string;
  mascot_id: string;
  instructions: string;
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
          .single();

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.role === 'admin');
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
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
      console.log('[useMascotSkills] Fetching skills for mascot:', mascotId);
      const { data, error } = await supabase.rpc('get_mascot_skills', {
        p_mascot_id: mascotId,
      });

      if (error) {
        console.error('[useMascotSkills] RPC error:', error);
        // Code 42883 = function does not exist (RPC not deployed)
        if (error.code === '42883') {
          setSkills([]);
          setError(null);
        } else {
          setError(error.message);
          setSkills([]);
        }
      } else {
        console.log('[useMascotSkills] Fetched skills:', data?.length || 0, 'skills');
        setSkills(data || []);
        setError(null);
      }
    } catch (err: any) {
      console.error('[useMascotSkills] Exception:', err);
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
    console.log('[useMascotSkills] Refetch called for mascot:', mascotId);
    await fetchSkills();
  }, [fetchSkills, mascotId]);

  return { skills, isLoading, error, refetch };
}

// Hook to get instructions for a mascot
export function useMascotInstructions(mascotId: string | null) {
  const [instructions, setInstructions] = useState<MascotInstructions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructions = useCallback(async () => {
    if (!mascotId) {
      setInstructions(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mascot_instructions')
        .select('*')
        .eq('mascot_id', mascotId)
        .single();

      // PGRST116 = no rows returned, 42P01 = table doesn't exist
      if (error && error.code !== 'PGRST116') {
        if (error.code === '42P01') {
          setInstructions(null);
          setError(null);
        } else {
          setError(error.message);
          setInstructions(null);
        }
      } else {
        setInstructions(data || null);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      setInstructions(null);
    } finally {
      setIsLoading(false);
    }
  }, [mascotId]);

  useEffect(() => {
    fetchInstructions();
  }, [fetchInstructions]);

  return { instructions, isLoading, error, refetch: fetchInstructions };
}

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

  console.log('[Admin] Creating skill for mascot:', mascotId, 'label:', skillLabel);

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
    console.error('[Admin] Error creating skill:', error);
    throw new Error(error.message || 'Failed to create skill');
  }
  
  console.log('[Admin] Skill created successfully:', data);
  return data;
}

export async function updateSkill(
  skillId: string,
  updates: { skill_label?: string; skill_prompt?: string; sort_order?: number; is_active?: boolean }
): Promise<MascotSkill> {
  console.log('[Admin] Updating skill:', skillId, 'with updates:', updates);
  
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
    console.error('[Admin] Error updating skill:', error);
    throw new Error(error.message || 'Failed to update skill');
  }
  
  console.log('[Admin] Skill updated successfully:', data);
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

// Admin CRUD operations for instructions
export async function upsertInstructions(
  mascotId: string,
  instructions: string
): Promise<MascotInstructions> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  const { data, error } = await supabase
    .from('mascot_instructions')
    .upsert(
      {
        mascot_id: mascotId,
        instructions,
      },
      {
        onConflict: 'mascot_id',
      }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Get combined prompt for chat (instructions + skill prompt)
export async function getCombinedPrompt(
  mascotId: string,
  skillId: string
): Promise<{ instructions: string; skillPrompt: string; combined: string }> {
  if (!mascotId) {
    throw new Error('Invalid mascot ID');
  }

  // Fetch instructions
  const { data: instructionsData, error: instructionsError } = await supabase
    .from('mascot_instructions')
    .select('instructions')
    .eq('mascot_id', mascotId)
    .single();

  if (instructionsError && instructionsError.code !== 'PGRST116') {
    throw new Error(instructionsError.message);
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
  const instructions = instructionsData?.instructions || '';

  // Combine: instructions first, then skill prompt
  const combined = instructions 
    ? `${instructions}\n\n---\n\n${skillPrompt}`
    : skillPrompt;

  return {
    instructions,
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
