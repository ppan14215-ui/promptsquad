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
import { logger } from '@/lib/utils/logger';
import {
    ALL_MASCOTS,
    FREE_MASCOTS,
    mascotImages,
    OwnedMascot,
    MascotColor,
} from '@/config/mascots';

type SkillRow = {
    id: string;
    mascot_id: string;
    skill_label: string;
    skill_summary?: string | null;
    skill_prompt_preview?: string | null;
    skill_prompt?: string | null;
    sort_order?: number;
    preferred_provider?: string | null;
};

function inferIsFreeMascot(m: { id: string; is_free?: boolean | null; isFree?: boolean | null }): boolean {
    const raw = m.is_free !== undefined && m.is_free !== null ? m.is_free : m.isFree;
    if (raw === true) return true;
    if (raw === false) return false;
    const n = parseInt(m.id, 10);
    return !Number.isNaN(n) && n <= 4;
}

/** Batch-fetch active skills via get_mascot_skills_by_ids RPC (full prompts); falls back to mascot_skills table. */
function useAllMascotSkills(mascotIds: string[], dbMascots: MascotBasic[]) {
    const [skillsByMascot, setSkillsByMascot] = useState<
        Record<string, { id: string; label: string; summary?: string; prompt?: string; preferredProvider?: string | null }[]>
    >({});
    const [isLoading, setIsLoading] = useState(true);

    const idsKey = mascotIds.join(',');
    const metaKey = useMemo(
        () => dbMascots.map((m) => `${m.id}:${m.is_free}:${m.owner_id ?? ''}`).join('|'),
        [dbMascots]
    );

    const fetchAll = useCallback(async () => {
        if (!mascotIds.length) {
            setSkillsByMascot({});
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const rpc = await supabase.rpc('get_mascot_skills_by_ids', { p_mascot_ids: mascotIds });
            let data: SkillRow[] | null = (rpc.data as SkillRow[]) ?? null;
            let error = rpc.error;

            if (error) {
                logger.warn('[useAllMascotSkills] RPC failed, using table:', error.message);
                const tbl = await supabase
                    .from('mascot_skills' as any)
                    .select('*')
                    .in('mascot_id', mascotIds)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: true });
                data = tbl.data as SkillRow[] | null;
                error = tbl.error;
            }

            if (error || !data) {
                if (error) {
                    logger.error('[useAllMascotSkills] skills query failed:', error);
                }
                setSkillsByMascot({});
                setIsLoading(false);
                return;
            }
            const map: Record<
                string,
                { id: string; label: string; summary?: string; prompt?: string; preferredProvider?: string | null }[]
            > = {};
            for (const row of data as SkillRow[]) {
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
                    // Full DB prompts for everyone — access is gated by which mascots appear in the app (free/pro/unlock/custom), not by subscription tier.
                    prompt: row.skill_prompt || undefined,
                    preferredProvider: row.preferred_provider ?? null,
                });
            }
            setSkillsByMascot(map);
        } catch (e) {
            logger.error('[useAllMascotSkills] fetch failed:', e);
            setSkillsByMascot({});
        } finally {
            setIsLoading(false);
        }
    }, [idsKey, metaKey, mascotIds, dbMascots]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return { skillsByMascot, isLoadingSkills: isLoading };
}

export function useMergedMascots() {
    const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError, refetch: refetchMascots } = useMascotsData();
    const { unlockedMascotIds, isLoading: isLoadingUnlocked } = useUnlockedMascots();
    const { isAdmin } = useIsAdmin();
    const { isSubscribed } = useSubscription();
    const { user } = useAuth();

    const dbMascotIds = useMemo(() => dbMascots.map(m => m.id), [dbMascots]);
    const { skillsByMascot, isLoadingSkills } = useAllMascotSkills(dbMascotIds, dbMascots);

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

                    const isFree = inferIsFreeMascot(m);
                    const isPro = !isFree && !isCustom;

                    // Prefer DB-driven skills. If DB returns nothing (e.g. prod RPC/policy drift),
                    // fall back to bundled skills so non-admin users don't see empty mascots.
                    const dbSkills = skillsByMascot[m.id];
                    const fallbackSkills = hardcodedMascot?.skills ?? [];
                    const skills =
                        dbSkills && dbSkills.length > 0
                            ? dbSkills
                            : isLoadingSkills
                                ? []
                                : fallbackSkills;

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

                    // Pro / custom: onboarding or purchases (unlockedMascotIds), or user's own custom.
                    // Free-tier mascots are always shown so the deck is never empty once DB rows load.
                    if (m.isFree) return true;

                    const hasAccess = unlockedMascotIds.includes(m.id);
                    const isOwnCustom =
                        m.isCustom && !!user?.id && m.ownerId === user.id;
                    return hasAccess || isOwnCustom;
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
    }, [dbMascots, isAdmin, isSubscribed, unlockedMascotIds, skillsByMascot, isLoadingSkills, user?.id]);

    return {
        availableMascots,
        isLoading: isLoadingMascots || isLoadingUnlocked || isLoadingSkills,
        error: mascotsError,
        refetch: refetchMascots
    };
}
