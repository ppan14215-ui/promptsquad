import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { MascotBasic } from '@/services/admin';
import { useMascotsData } from '@/context/MascotsDataContext';
import { useUnlockedMascots } from '@/services/mascot-access';
import { useIsAdmin } from '@/services/admin';
import { useSubscription } from '@/services/subscription';
import {
  collectRemoteMascotImageUris,
  getMascotGrayscaleImageSource,
  getMascotImageSource,
} from '@/services/admin/mascot-images';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';
import {
    ALL_MASCOTS,
    FREE_MASCOTS,
    mascotImages,
    OwnedMascot,
    MascotColor
} from '@/config/mascots';

type SkillRow = {
    id: string;
    mascot_id: string;
    skill_label: string;
    skill_summary?: string | null;
    skill_prompt_preview?: string | null;
    skill_prompt?: string | null;
    sort_order?: number;
};

/** Fetch all active skills for all mascots in one query (same table as useMascotSkills — avoids empty view JOINs). */
function useAllMascotSkills(
    mascotIds: string[],
    dbMascots: MascotBasic[],
    opts: { isAdmin: boolean; isSubscribed: boolean; userId: string | undefined }
) {
    const [skillsByMascot, setSkillsByMascot] = useState<Record<string, { id: string; label: string; summary?: string; prompt?: string }[]>>({});

    const idsKey = mascotIds.join(',');
    const metaKey = useMemo(
        () => dbMascots.map((m) => `${m.id}:${m.is_free}:${m.owner_id ?? ''}`).join('|'),
        [dbMascots]
    );

    const { isAdmin, isSubscribed, userId } = opts;

    const fetchAll = useCallback(async () => {
        if (!mascotIds.length) {
            setSkillsByMascot({});
            return;
        }
        try {
            const { data, error } = await supabase
                .from('mascot_skills' as any)
                .select('*')
                .in('mascot_id', mascotIds)
                .eq('is_active', true)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });
            if (error || !data) {
                setSkillsByMascot({});
                return;
            }
            const map: Record<string, { id: string; label: string; summary?: string; prompt?: string }[]> = {};
            for (const row of data as SkillRow[]) {
                const mascot = dbMascots.find((m) => m.id === row.mascot_id);
                const isFree = mascot?.is_free ?? false;
                const isOwner = !!(userId && mascot?.owner_id === userId);
                const hasFullAccess = isAdmin || isSubscribed || isFree || isOwner;
                const preview =
                    row.skill_prompt_preview ||
                    (row.skill_prompt
                        ? row.skill_prompt.substring(0, Math.max(1, Math.floor(row.skill_prompt.length / 4)))
                        : '');
                const summary =
                    (typeof row.skill_summary === 'string' && row.skill_summary.trim()) ? row.skill_summary.trim() : preview || undefined;
                if (!map[row.mascot_id]) map[row.mascot_id] = [];
                map[row.mascot_id].push({
                    id: row.id,
                    label: row.skill_label,
                    summary,
                    prompt: hasFullAccess ? (row.skill_prompt || undefined) : undefined,
                });
            }
            setSkillsByMascot(map);
        } catch {
            setSkillsByMascot({});
        }
    }, [idsKey, metaKey, isAdmin, isSubscribed, userId, mascotIds, dbMascots]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return skillsByMascot;
}

export function useMergedMascots() {
    const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError, refetch: refetchMascots } = useMascotsData();
    const { unlockedMascotIds, isLoading: isLoadingUnlocked } = useUnlockedMascots();
    const { isAdmin } = useIsAdmin();
    const { isSubscribed } = useSubscription();
    const { user } = useAuth();

    const dbMascotIds = useMemo(() => dbMascots.map(m => m.id), [dbMascots]);
    const skillsByMascot = useAllMascotSkills(dbMascotIds, dbMascots, {
        isAdmin,
        isSubscribed,
        userId: user?.id,
    });

    const remoteMascotImagePrefetchKey = useMemo(
        () => dbMascots.map((m) => `${m.id}:${m.image_url || ''}`).join('\n'),
        [dbMascots]
    );

    useEffect(() => {
        const uris = collectRemoteMascotImageUris(dbMascots.map((m) => m.image_url));
        if (!uris.length) return;
        void ExpoImage.prefetch(uris, 'memory-disk').catch(() => {});
    }, [remoteMascotImagePrefetchKey]);

    const availableMascots = useMemo(() => {
        let convertedMascots: OwnedMascot[] = [];

        if (dbMascots.length > 0) {
            // Convert database mascots to OwnedMascot type
            convertedMascots = dbMascots
                .map((m: MascotBasic) => {
                    const imageSource = getMascotImageSource(m.image_url || null) || mascotImages.bear;
                    const grayscaleImageSource = getMascotGrayscaleImageSource(m.image_url || null) || imageSource;
                    // Find matching hardcoded mascot for fallback questionPrompt
                    const hardcodedMascot = ALL_MASCOTS.find((hm) => hm.id === m.id);
                    const isCustom = m.is_custom || false;
                    const isComingSoon = m.is_ready === false;

                    const isFree = m.is_free !== undefined ? m.is_free : (parseInt(m.id) <= 4);
                    const isPro = !isFree && !isCustom;

                    // Use DB skills if available, fallback to hardcoded
                    const dbSkills = skillsByMascot[m.id];
                    const skills = dbSkills && dbSkills.length > 0
                        ? dbSkills
                        : (hardcodedMascot?.skills || []);

                    return {
                        id: m.id,
                        name: m.name,
                        subtitle: m.subtitle || '',
                        longBio: m.description ?? null,
                        image: imageSource,
                        grayscaleImage: grayscaleImageSource,
                        color: (m.color || 'yellow') as MascotColor,
                        questionPrompt: m.question_prompt || hardcodedMascot?.questionPrompt || 'How can I help you?',
                        personality: hardcodedMascot?.personality || [],
                        models: hardcodedMascot?.models || [],
                        skills,
                        isPro: isPro,
                        isFree: isFree,
                        isCustom: isCustom,
                        ownerId: m.owner_id || undefined,
                        bio: m.bio ?? null,
                        isComingSoon,
                    } as OwnedMascot;
                });

            // Filter for non-admin users
            if (!isAdmin) {
                convertedMascots = convertedMascots.filter((m) => {
                    const dbMascot = dbMascots.find(db => db.id === m.id);
                    const isVisible = dbMascot?.is_visible !== false;

                    // Hide only non-visible; not-ready mascots stay listed (greyed out in UI)
                    if (!isVisible) return false;

                    // Subscribers see all visible, non-coming-soon mascots
                    if (isSubscribed) return true;

                    // Free users: only show mascots they have access to
                    // - Their onboarding picks or purchased mascots (in unlockedMascotIds)
                    // - Custom mascots they own
                    // - Fallback: when unlockedMascotIds is empty (e.g. onboarding disabled),
                    //   show all free mascots so new users have something in their deck
                    const hasAccess = unlockedMascotIds.includes(m.id);
                    const isOwnCustom = m.isCustom && !!m.ownerId;
                    const noUnlocksYet = unlockedMascotIds.length === 0;
                    const fallbackToFree = noUnlocksYet && m.isFree;
                    return hasAccess || isOwnCustom || fallbackToFree;
                });
            }
        } else {
            // Fallback to hardcoded data
            convertedMascots = (isAdmin ? ALL_MASCOTS : FREE_MASCOTS).map(m => ({
                ...m,
                isPro: parseInt(m.id) > 4,
                isComingSoon: false,
            }));
        }

        return convertedMascots;
    }, [dbMascots, isAdmin, isSubscribed, unlockedMascotIds, skillsByMascot]);

    return {
        availableMascots,
        isLoading: isLoadingMascots || isLoadingUnlocked,
        error: mascotsError,
        refetch: refetchMascots
    };
}
