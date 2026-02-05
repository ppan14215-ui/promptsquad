
import { useMemo } from 'react';
import { useMascots, MascotBasic } from '@/services/admin';
import { useUnlockedMascots } from '@/services/mascot-access';
import { useIsAdmin } from '@/services/admin';
import { useSubscription } from '@/services/subscription';
import { getMascotImageSource } from '@/services/admin/mascot-images';
import {
    ALL_MASCOTS,
    FREE_MASCOTS,
    mascotImages,
    OwnedMascot,
    MascotColor
} from '@/config/mascots';

export function useMergedMascots() {
    const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError } = useMascots();
    const { unlockedMascotIds, isLoading: isLoadingUnlocked } = useUnlockedMascots();
    const { isAdmin } = useIsAdmin();
    const { isSubscribed } = useSubscription();

    const availableMascots = useMemo(() => {
        let convertedMascots: OwnedMascot[] = [];

        if (dbMascots.length > 0) {
            // Convert database mascots to OwnedMascot type
            convertedMascots = dbMascots
                .map((m: MascotBasic) => {
                    const imageSource = getMascotImageSource(m.image_url || null) || mascotImages.bear;
                    // Find matching hardcoded mascot for fallback questionPrompt
                    const hardcodedMascot = ALL_MASCOTS.find((hm) => hm.id === m.id);

                    // Logic: Trust DB is_free/is_pro if present. Fallback to index logic.
                    // is_free is the source of truth in DB. is_pro is derived in useMascots.
                    const isFree = m.is_free !== undefined ? m.is_free : (parseInt(m.id) <= 4);
                    const isPro = !isFree;

                    return {
                        id: m.id,
                        name: m.name,
                        subtitle: m.subtitle || '',
                        image: imageSource,
                        color: (m.color || 'yellow') as MascotColor,
                        questionPrompt: m.question_prompt || hardcodedMascot?.questionPrompt || 'How can I help you?',
                        personality: hardcodedMascot?.personality || [],
                        models: hardcodedMascot?.models || [],
                        skills: hardcodedMascot?.skills || [], // Include hardcoded skills as fallback
                        isPro: isPro,
                        isFree: isFree,
                    } as OwnedMascot;
                });

            // Filter out mascots that are not ready (unless admin)
            if (!isAdmin) {
                convertedMascots = convertedMascots.filter((m) => {
                    const dbMascot = dbMascots.find(db => db.id === m.id);
                    // Default to true (visible) if is_ready is null/undefined to avoid hiding everything before migration runs
                    return dbMascot?.is_ready !== false;
                });
            }
        } else {
            // Fallback to hardcoded data
            convertedMascots = (isAdmin ? ALL_MASCOTS : FREE_MASCOTS).map(m => ({
                ...m,
                isPro: parseInt(m.id) > 4 // Hardcoded fallback logic
            }));
        }

        // For admin, show all mascots
        if (isAdmin) {
            return convertedMascots;
        }

        // For regular users, only show unlocked mascots
        if (isLoadingUnlocked) {
            return [];
        }

        // Pro Users: Show whatever they have unlocked/selected
        if (isSubscribed) {
            return convertedMascots.filter(m => unlockedMascotIds.includes(m.id));
        }

        // Free Users: Strict enforcement - ONLY show mascots marked as Free
        // Ignores unlockedMascotIds which might contain user selections from before
        return convertedMascots.filter(m => m.isFree === true);

    }, [dbMascots, isAdmin, isSubscribed, unlockedMascotIds, isLoadingUnlocked]);

    return {
        availableMascots,
        isLoading: isLoadingMascots || isLoadingUnlocked,
        error: mascotsError
    };
}
