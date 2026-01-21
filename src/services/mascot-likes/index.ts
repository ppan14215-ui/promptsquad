import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';

/**
 * Hook to manage likes for a specific mascot
 */
export function useMascotLike(mascotId: string | null) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Fetch initial like state and count
  useEffect(() => {
    if (!mascotId) {
      setIsLoading(false);
      return;
    }

    async function fetchLikeData() {
      try {
        // Fetch like count
        const { count, error: countError } = await supabase
          .from('mascot_likes')
          .select('*', { count: 'exact', head: true })
          .eq('mascot_id', mascotId as string);

        if (countError) {
          setLikeCount(0);
        } else {
          setLikeCount(count || 0);
        }

        // Check if current user has liked
        if (user) {
          const { data, error: likeError } = await supabase
            .from('mascot_likes')
            .select('id')
            .eq('mascot_id', mascotId as string)
            .eq('user_id', user.id)
            .maybeSingle();

          if (likeError) {
            setIsLiked(false);
          } else {
            setIsLiked(!!data);
          }
        } else {
          setIsLiked(false);
        }
      } catch (error) {
        setLikeCount(0);
        setIsLiked(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLikeData();
  }, [mascotId, user]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!mascotId || isToggling) {
      return;
    }

    if (!user) {
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
          .eq('mascot_id', mascotId)
          .eq('user_id', user.id);

        if (error) {
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
            mascot_id: mascotId as string,
            user_id: user.id,
          } as any);

        if (error) {
          // Show error to user
        } else {
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      // Handle error
    } finally {
      setIsToggling(false);
    }
  }, [mascotId, user, isLiked, isToggling]);

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
        const validIds = mascotIds.filter((id): id is string => id !== null);

        if (validIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Fetch like counts for all mascots
        const { data, error } = await supabase
          .from('mascot_likes')
          .select('mascot_id')
          .in('mascot_id', validIds);

        if (error) {
          setIsLoading(false);
          return;
        }

        // Count likes per mascot
        const counts: Record<string, number> = {};
        validIds.forEach((id) => {
          counts[id] = 0;
        });

        data?.forEach((like: { mascot_id: string }) => {
          const mascotId = like.mascot_id;
          counts[mascotId] = (counts[mascotId] || 0) + 1;
        });

        setLikeCounts(counts);
      } catch (error) {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    }

    fetchLikeCounts();
  }, [JSON.stringify(mascotIds)]); // Re-fetch when mascot IDs change

  return { likeCounts, isLoading };
}
