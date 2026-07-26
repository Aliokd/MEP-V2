"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isEntitled, type PlanId } from '@/lib/paddle/config';

export interface UserPlan {
    plan: PlanId | null;
    subscriptionStatus: string | null;
    /** True only for a Max plan that is actually paid up (or trialing). */
    hasMax: boolean;
    loading: boolean;
}

/**
 * Reads the current user's billing tier from users/{uid}.
 *
 * Live rather than one-shot so a checkout completing in the Paddle overlay flips
 * the UI as soon as the webhook lands, without a reload.
 *
 * This is a *presentation* gate — it decides what the UI offers, not what the
 * backend allows. Anything that actually costs money or exposes paid data has to
 * re-check entitlement server-side.
 */
export function useUserPlan(): UserPlan {
    const { user, loading: authLoading } = useAuth();
    const [state, setState] = useState<Omit<UserPlan, 'loading'>>({
        plan: null,
        subscriptionStatus: null,
        hasMax: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setState({ plan: null, subscriptionStatus: null, hasMax: false });
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
                const billing = snap.data()?.billing ?? {};
                const plan = (billing.plan ?? null) as PlanId | null;
                const subscriptionStatus = (billing.subscriptionStatus ?? null) as string | null;
                setState({
                    plan,
                    subscriptionStatus,
                    hasMax: plan === 'max' && isEntitled(subscriptionStatus),
                });
                setLoading(false);
            },
            (err) => {
                // Fail closed: an unreadable billing doc shows the locked state
                // rather than handing out Max features on an error.
                console.error('[useUserPlan] Failed to read billing:', err);
                setState({ plan: null, subscriptionStatus: null, hasMax: false });
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [user, authLoading]);

    return { ...state, loading: loading || authLoading };
}
