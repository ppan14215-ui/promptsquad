import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

export type UserOwnedMascot = {
    id: string;
    user_id: string;
    mascot_id: string;
    purchased_at: string;
};

export function useOwnedMascots() {
    const { session } = useAuth();
    const [ownedMascots, setOwnedMascots] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session?.user) {
            setOwnedMascots([]);
            setLoading(false);
            return;
        }

        const fetchOwnedMascots = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_owned_mascots')
                    .select('mascot_id')
                    .eq('user_id', session.user.id);

                if (error) {
                    console.error('Error fetching owned mascots:', error);
                    return;
                }

                if (data) {
                    setOwnedMascots(data.map(item => item.mascot_id));
                }
            } catch (err) {
                console.error('Failed to fetch owned mascots:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOwnedMascots();

        // Subscribe to changes (e.g. after a purchase)
        const subscription = supabase
            .channel('user_owned_mascots_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_owned_mascots',
                    filter: `user_id=eq.${session.user.id}`,
                },
                (payload) => {
                    fetchOwnedMascots();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [session?.user?.id]);

    return { ownedMascots, loading };
}
