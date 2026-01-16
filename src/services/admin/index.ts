import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

// Helper: Map simple mascot IDs to database UUIDs
// This maps the route params (like '1', '2') to actual database UUIDs
// For now, we'll use the simple ID as-is and let the database handle it
// In production, these should map to actual UUIDs from the database
const MASCOT_ID_TO_UUID: Record<string, string> = {
  '1': '11111111-1111-1111-1111-111111111111', // Analyst Bear
  '2': '22222222-2222-2222-2222-222222222222', // Writer Fox
  '3': '33333333-3333-3333-3333-333333333333', // UX Panda
  '4': '44444444-4444-4444-4444-444444444444', // Advice Zebra
  '5': '55555555-5555-5555-5555-555555555555', // Teacher Owl
  '6': '66666666-6666-6666-6666-666666666666', // Prompt Turtle
  '7': '77777777-7777-7777-7777-777777777777', // Data Badger
  '8': '88888888-8888-8888-8888-888888888888', // Quick Mouse
  '9': '99999999-9999-9999-9999-999999999999', // Creative Pig
  '10': '10101010-1010-1010-1010-101010101010', // Code Cat
  '11': '11111111-1111-1111-1111-111111111112', // Strategy Camel
  '12': '12121212-1212-1212-1212-121212121212', // Marketing Frog
  '13': '13131313-1313-1313-1313-131313131313', // Product Giraffe
  '14': '14141414-1414-1414-1414-141414141414', // Support Lion
  '15': '15151515-1515-1515-1515-151515151515', // Mentor Seahorse
  '16': '16161616-1616-1616-1616-161616161616', // Project Camel
  '17': '17171717-1717-1717-1717-171717171717', // Research Frog
  '18': '18181818-1818-1818-1818-181818181818', // Agile Giraffe
  '19': '19191919-1919-1919-1919-191919191919', // Brand Lion
  '20': '20202020-2020-2020-2020-202020202020', // Dev Seahorse
};

/**
 * Convert a mascot ID (simple string or UUID) to database UUID
 * If it's already a UUID (contains dashes and is 36 chars), return as-is
 * Otherwise, map it using MASCOT_ID_TO_UUID
 */
function getMascotUUID(mascotId: string | null): string | null {
  if (!mascotId) return null;
  
  // If it's already a UUID format (contains dashes), return as-is
  if (mascotId.includes('-') && mascotId.length === 36) {
    return mascotId;
  }
  
  // Otherwise, map simple ID to UUID
  return MASCOT_ID_TO_UUID[mascotId] || mascotId;
}

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

// Hook to get all mascots (for admin dropdown)
export function useMascots() {
  const [mascots, setMascots] = useState<MascotBasic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMascots() {
      try {
        const { data, error } = await supabase
          .from('mascots')
          .select('id, name, subtitle, image_url, color')
          .eq('is_active', true)
          .order('sort_order');

        if (error) throw error;
        setMascots(data || []);
      } catch (err: any) {
        console.error('Error fetching mascots:', err);
        setError(err.message);
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

    // Convert simple ID to UUID
    const mascotUUID = getMascotUUID(mascotId);
    if (!mascotUUID) {
      setSkills([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_mascot_skills', {
        p_mascot_id: mascotUUID,
      });

      if (error) {
        // Don't throw for common errors - just return empty skills
        // Code 22P02 = invalid input syntax (UUID format issue)
        // Code 42883 = function does not exist (RPC not deployed)
        if (error.code === '22P02' || error.code === '42883') {
          console.warn('Skills RPC not available or invalid mascot ID, using fallback:', error.message);
          setSkills([]);
          setError(null);
        } else {
          throw error;
        }
      } else {
        setSkills(data || []);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching skills:', err);
      setError(err.message);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }, [mascotId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  return { skills, isLoading, error, refetch: fetchSkills };
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

    // Convert simple ID to UUID
    const mascotUUID = getMascotUUID(mascotId);
    if (!mascotUUID) {
      setInstructions(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mascot_instructions')
        .select('*')
        .eq('mascot_id', mascotUUID)
        .single();

      // PGRST116 = no rows returned, 22P02 = invalid UUID, 42P01 = table doesn't exist
      if (error && error.code !== 'PGRST116') {
        if (error.code === '22P02' || error.code === '42P01') {
          console.warn('Instructions table not available or invalid mascot ID:', error.message);
          setInstructions(null);
          setError(null);
        } else {
          throw error;
        }
      } else {
        setInstructions(data || null);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching instructions:', err);
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
  // Convert simple ID to UUID
  const mascotUUID = getMascotUUID(mascotId);
  if (!mascotUUID) {
    throw new Error('Invalid mascot ID');
  }

  const { data, error } = await supabase
    .from('mascot_skills')
    .insert({
      mascot_id: mascotUUID,
      skill_label: skillLabel,
      skill_prompt: skillPrompt,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSkill(
  skillId: string,
  updates: { skill_label?: string; skill_prompt?: string; sort_order?: number; is_active?: boolean }
): Promise<MascotSkill> {
  const { data, error } = await supabase
    .from('mascot_skills')
    .update(updates)
    .eq('id', skillId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSkill(skillId: string): Promise<void> {
  const { error } = await supabase
    .from('mascot_skills')
    .delete()
    .eq('id', skillId);

  if (error) throw new Error(error.message);
}

// Admin CRUD operations for instructions
export async function upsertInstructions(
  mascotId: string,
  instructions: string
): Promise<MascotInstructions> {
  // Convert simple ID to UUID
  const mascotUUID = getMascotUUID(mascotId);
  if (!mascotUUID) {
    throw new Error('Invalid mascot ID');
  }

  const { data, error } = await supabase
    .from('mascot_instructions')
    .upsert(
      {
        mascot_id: mascotUUID,
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
  // Convert simple ID to UUID
  const mascotUUID = getMascotUUID(mascotId);
  if (!mascotUUID) {
    throw new Error('Invalid mascot ID');
  }

  // Fetch instructions
  const { data: instructionsData, error: instructionsError } = await supabase
    .from('mascot_instructions')
    .select('instructions')
    .eq('mascot_id', mascotUUID)
    .single();

  if (instructionsError && instructionsError.code !== 'PGRST116') {
    throw new Error(instructionsError.message);
  }

  // Fetch skill (using RPC to get full prompt for admins)
  const { data: skillsData, error: skillsError } = await supabase.rpc('get_mascot_skills', {
    p_mascot_id: mascotUUID,
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
  // Convert simple ID to UUID
  const mascotUUID = getMascotUUID(mascotId);
  if (!mascotUUID) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_mascot_skills', {
    p_mascot_id: mascotUUID,
  });

  if (error) {
    console.error('Error fetching skill:', error);
    return null;
  }

  return (data || []).find((s: MascotSkill) => s.id === skillId) || null;
}
