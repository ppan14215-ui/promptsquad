
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMascots, MascotBasic } from '@/services/admin';
import { useUnlockedMascots } from '@/services/mascot-access';
import { useIsAdmin } from '@/services/admin';
import { getMascotImageSource } from '@/services/admin/mascot-images';
import { supabase } from '@/services/supabase';
import {
    ALL_MASCOTS,
    FREE_MASCOTS,
    mascotImages,
    OwnedMascot,
    MascotColor
} from '@/config/mascots';

type SkillRow = { id: string; mascot_id: string; skill_label: string; skill_prompt?: string | null; sort_order?: number };

/** Fetch all active skills for all mascots in one query. */
function useAllMascotSkills(mascotIds: string[]) {
    const [skillsByMascot, setSkillsByMascot] = useState<Record<string, { id: string; label: string; prompt?: string }[]>>({});

    const idsKey = mascotIds.join(',');

    const fetchAll = useCallback(async () => {
        if (!mascotIds.length) { setSkillsByMascot({}); return; }
        try {
            const { data, error } = await supabase
                .from('public_mascot_skills' as any)
                .select('id, mascot_id, skill_label, skill_prompt, sort_order')
                .in('mascot_id', mascotIds)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error || !data) { setSkillsByMascot({}); return; }
            const map: Record<string, { id: string; label: string; prompt?: string }[]> = {};
            for (const row of data as SkillRow[]) {
                if (!map[row.mascot_id]) map[row.mascot_id] = [];
                map[row.mascot_id].push({ id: row.id, label: row.skill_label, prompt: row.skill_prompt || undefined });
            }
            setSkillsByMascot(map);
        } catch {
            setSkillsByMascot({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return skillsByMascot;
}

export function useMergedMascots() {
    const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError, refetch: refetchMascots } = useMascots();
    const { isLoading: isLoadingUnlocked } = useUnlockedMascots();
    const { isAdmin } = useIsAdmin();

    const dbMascotIds = useMemo(() => dbMascots.map(m => m.id), [dbMascots]);
    const skillsByMascot = useAllMascotSkills(dbMascotIds);

    const availableMascots = useMemo(() => {
        let convertedMascots: OwnedMascot[] = [];

        if (dbMascots.length > 0) {
            // Convert database mascots to OwnedMascot type
            convertedMascots = dbMascots
                .map((m: MascotBasic) => {
                    const imageSource = getMascotImageSource(m.image_url || null) || mascotImages.bear;
                    // Find matching hardcoded mascot for fallback questionPrompt
                    const hardcodedMascot = ALL_MASCOTS.find((hm) => hm.id === m.id);
                    const isCustom = m.is_custom || false;
                    const isComingSoon = m.is_active === false;

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
                        image: imageSource,
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

            // Filter out mascots that are not ready or not visible (unless admin)
            if (!isAdmin) {
                convertedMascots = convertedMascots.filter((m) => {
                    const dbMascot = dbMascots.find(db => db.id === m.id);
                    const isVisible = dbMascot?.is_visible !== false;
                    return isVisible;
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
    }, [dbMascots, isAdmin, skillsByMascot]);

    return {
        availableMascots,
        isLoading: isLoadingMascots || isLoadingUnlocked,
        error: mascotsError,
        refetch: refetchMascots
    };
}
