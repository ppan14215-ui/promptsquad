import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

// Helper: Map simple mascot IDs to database UUIDs (same as in admin service)
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

/**
 * Hook to manage likes for a specific mascot
 */
export function useMascotLike(mascotId: string | null) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const mascotUUID = getMascotUUID(mascotId);

  // Fetch initial like state and count
  useEffect(() => {
    if (!mascotUUID) {
      setIsLoading(false);
      return;
    }

    async function fetchLikeData() {
      try {
        // Fetch like count
        const { count, error: countError } = await supabase
          .from('mascot_likes')
          .select('*', { count: 'exact', head: true })
          .eq('mascot_id', mascotUUID);

        if (countError) {
          console.error('Error fetching like count:', countError);
        } else {
          setLikeCount(count || 0);
        }

        // Check if current user has liked
        if (user) {
          const { data, error: likeError } = await supabase
            .from('mascot_likes')
            .select('id')
            .eq('mascot_id', mascotUUID)
            .eq('user_id', user.id)
            .maybeSingle();

          if (likeError) {
            console.error('Error checking like status:', likeError);
          } else {
            setIsLiked(!!data);
          }
        } else {
          setIsLiked(false);
        }
      } catch (error) {
        console.error('Error fetching like data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLikeData();
  }, [mascotUUID, user]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!mascotUUID || isToggling) {
      console.log('Cannot toggle: missing mascotUUID or already toggling');
      return;
    }

    if (!user) {
      console.log('User not authenticated - cannot like');
      // TODO: Show login prompt or toast message
      return;
    }

    setIsToggling(true);
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('mascot_likes')
          .delete()
          .eq('mascot_id', mascotUUID)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error unliking:', error);
          // Show error to user
        } else {
          setIsLiked(false);
          setLikeCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Like
        const { error } = await supabase
          .from('mascot_likes')
          .insert({
            mascot_id: mascotUUID,
            user_id: user.id,
          });

        if (error) {
          console.error('Error liking:', error);
          // Show error to user
        } else {
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsToggling(false);
    }
  }, [mascotUUID, user, isLiked, isToggling]);

  return {
    isLiked,
    likeCount,
    isLoading,
    isToggling,
    toggleLike,
  };
}

/**
 * Hook to get like counts for multiple mascots
 */
export function useMascotLikeCounts(mascotIds: (string | null)[]) {
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (mascotIds.length === 0) {
      setIsLoading(false);
      return;
    }

    async function fetchLikeCounts() {
      try {
        const mascotUUIDs = mascotIds
          .map((id) => getMascotUUID(id))
          .filter((uuid): uuid is string => uuid !== null);

        if (mascotUUIDs.length === 0) {
          setIsLoading(false);
          return;
        }

        // Fetch like counts for all mascots
        const { data, error } = await supabase
          .from('mascot_likes')
          .select('mascot_id')
          .in('mascot_id', mascotUUIDs);

        if (error) {
          console.error('Error fetching like counts:', error);
          setIsLoading(false);
          return;
        }

        // Count likes per mascot
        const counts: Record<string, number> = {};
        mascotUUIDs.forEach((uuid) => {
          counts[uuid] = 0;
        });

        data?.forEach((like) => {
          const mascotId = like.mascot_id;
          counts[mascotId] = (counts[mascotId] || 0) + 1;
        });

        // Map back to original IDs (both UUID and simple IDs)
        const result: Record<string, number> = {};
        mascotIds.forEach((id) => {
          if (id) {
            const uuid = getMascotUUID(id);
            if (uuid) {
              result[id] = counts[uuid] || 0;
            }
          }
        });

        setLikeCounts(result);
      } catch (error) {
        console.error('Error fetching like counts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLikeCounts();
  }, [JSON.stringify(mascotIds)]); // Re-fetch when mascot IDs change

  return { likeCounts, isLoading };
}
