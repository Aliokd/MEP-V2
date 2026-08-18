"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface ActiveSanction {
    type: 'mute' | 'suspend' | 'ban';
    reason: string;
    /** ISO date the sanction lifts itself, or null for "until a moderator lifts it". */
    expiresAt: string | null;
    sanctionId?: string;
}

/**
 * The signed-in user's own sanction, live.
 *
 * A suspended or banned account never reaches this — Auth is disabled, so the
 * app shows the blocked screen instead. This exists for the mute, which leaves
 * the account working everywhere except the feed and therefore has to be
 * explained where it bites: a muted user whose post silently vanished would
 * report a bug, and they would be right to.
 *
 * Live rather than one-shot so lifting a mute in the console restores the
 * composer without the user reloading.
 */
export function useSanction(): { sanction: ActiveSanction | null; loading: boolean } {
    const { user, loading: authLoading } = useAuth();
    const [sanction, setSanction] = useState<ActiveSanction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setSanction(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
                const raw = snap.data()?.sanction;
                const expiresAtMillis = raw?.expiresAtMillis ?? null;
                const expired = typeof expiresAtMillis === 'number' && Date.now() >= expiresAtMillis;

                setSanction(raw?.active && !expired ? {
                    type: raw.type,
                    reason: raw.reason || '',
                    expiresAt: raw.expiresAt || null,
                    sanctionId: raw.sanctionId,
                } : null);
                setLoading(false);
            },
            // Fail open: an unreadable profile must not lock someone out of the
            // feed. The Firestore rule is what actually enforces the mute — this
            // hook only decides whether to explain it.
            () => { setSanction(null); setLoading(false); },
        );
        return () => unsubscribe();
    }, [user, authLoading]);

    return { sanction, loading };
}
