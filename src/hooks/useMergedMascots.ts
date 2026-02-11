
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
    const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError, refetch: refetchMascots } = useMascots();
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
                    const isCustom = m.is_custom || false;

                    // Logic: Trust DB is_free/is_pro if present. Fallback to index logic.
                    // is_free is the source of truth in DB. is_pro is derived in useMascots.
                    const isFree = m.is_free !== undefined ? m.is_free : (parseInt(m.id) <= 4);
                    const isPro = !isFree && !isCustom;

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
                        isCustom: isCustom,
                        ownerId: m.owner_id || undefined,
                    } as OwnedMascot;
                });

            // Filter out mascots that are not ready or not visible (unless admin)
            if (!isAdmin) {
                convertedMascots = convertedMascots.filter((m) => {
                    const dbMascot = dbMascots.find(db => db.id === m.id);
                    // Non-admin users should still see not-ready mascots as "Coming Soon".
                    const isVisible = dbMascot?.is_visible !== false;
                    return isVisible;
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

        // Pro Users: Show unlocked mascots + their own custom mascots
        // (RLS ensures we only receive the user's own custom mascots from DB)
        if (isSubscribed) {
            return convertedMascots.filter(m => {
                // Always include custom mascots — RLS already filters to owner only
                const dbMascot = dbMascots.find(db => db.id === m.id);
                if (dbMascot?.is_custom || dbMascot?.owner_id) return true;
                // Include unlocked/selected mascots
                return unlockedMascotIds.includes(m.id);
            });
        }

        // Free Users: Strict enforcement - ONLY show mascots marked as Free
        // Ignores unlockedMascotIds which might contain user selections from before
        return convertedMascots.filter(m => m.isFree === true);

    }, [dbMascots, isAdmin, isSubscribed, unlockedMascotIds, isLoadingUnlocked]);

    return {
        availableMascots,
        isLoading: isLoadingMascots || isLoadingUnlocked,
        error: mascotsError,
        refetch: refetchMascots
    };
}
