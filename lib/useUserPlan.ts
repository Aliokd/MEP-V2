"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isEntitled, type BillingPeriod, type PlanId } from '@/lib/paddle/config';

/**
 * The subscription as the webhook last wrote it, for screens that describe it
 * rather than gate on it (Settings). Every date is an ISO string or null.
 */
export interface BillingDetails {
    billingPeriod: BillingPeriod | null;
    /** True once a Paddle subscription has ever been attached to the account. */
    hasSubscription: boolean;
    trialEndsAt: string | null;
    nextBilledAt: string | null;
    currentPeriodEnd: string | null;
    /** A cancellation Paddle will apply at `effectiveAt`, if one is scheduled. */
    scheduledChange: { action: string; effectiveAt: string } | null;
}

export interface UserPlan {
    plan: PlanId | null;
    subscriptionStatus: string | null;
    /** Max: paid and entitled, or granted by an admin (`tier` max/comp). */
    hasMax: boolean;
    /** Pro or above. Everything Max is also Pro. */
    hasPro: boolean;
    /** Whether `hasPro`/`hasMax` comes from a paid, entitled Paddle subscription rather than an admin grant. */
    paid: boolean;
    billing: BillingDetails;
    loading: boolean;
}

const EMPTY_BILLING: BillingDetails = {
    billingPeriod: null,
    hasSubscription: false,
    trialEndsAt: null,
    nextBilledAt: null,
    currentPeriodEnd: null,
    scheduledChange: null,
};

const EMPTY: Omit<UserPlan, 'loading'> = {
    plan: null,
    subscriptionStatus: null,
    hasMax: false,
    hasPro: false,
    paid: false,
    billing: EMPTY_BILLING,
};

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
    const [state, setState] = useState<Omit<UserPlan, 'loading'>>(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setState(EMPTY);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
                const data = snap.data() ?? {};
                const billing = data.billing ?? {};
                const plan = (billing.plan ?? null) as PlanId | null;
                const subscriptionStatus = (billing.subscriptionStatus ?? null) as string | null;

                // Two things can put an account on Max, and they must agree:
                //  - a paid subscription, written by the Paddle webhook into
                //    `billing` and checked for entitlement; or
                //  - `tier`, which the admin console sets. "max" is a grant, and
                //    "comp" (complimentary) is the founders/staff case. Both are
                //    server-written — the rules refuse either from a client — so
                //    honouring them here hands out nothing a user could self-award.
                // Before this, the console's tier editor showed "max" as a choice
                // that unlocked nothing, because only `billing.plan` was read.
                const tier = typeof data.tier === 'string' ? data.tier : null;
                const entitled = isEntitled(subscriptionStatus);
                const paidMax = plan === 'max' && entitled;
                const grantedMax = tier === 'max' || tier === 'comp';
                const hasMax = paidMax || grantedMax;
                // Max includes Pro. Rooms sit on Pro; Business sits on Max.
                const paidPro = plan === 'pro' && entitled;
                const grantedPro = tier === 'pro';
                const hasPro = hasMax || paidPro || grantedPro;

                const scheduled = billing.scheduledChange;
                setState({
                    plan,
                    subscriptionStatus,
                    hasMax,
                    hasPro,
                    paid: (paidMax || paidPro),
                    billing: {
                        billingPeriod: (billing.billingPeriod ?? null) as BillingPeriod | null,
                        hasSubscription: typeof billing.paddleSubscriptionId === 'string' && billing.paddleSubscriptionId.length > 0,
                        trialEndsAt: typeof billing.trialEndsAt === 'string' ? billing.trialEndsAt : null,
                        nextBilledAt: typeof billing.nextBilledAt === 'string' ? billing.nextBilledAt : null,
                        currentPeriodEnd: typeof billing.currentPeriodEnd === 'string' ? billing.currentPeriodEnd : null,
                        scheduledChange: scheduled && typeof scheduled.effectiveAt === 'string'
                            ? { action: String(scheduled.action ?? ''), effectiveAt: scheduled.effectiveAt }
                            : null,
                    },
                });
                setLoading(false);
            },
            (err) => {
                // Fail closed: an unreadable billing doc shows the locked state
                // rather than handing out Max features on an error.
                console.error('[useUserPlan] Failed to read billing:', err);
                setState(EMPTY);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [user, authLoading]);

    return { ...state, loading: loading || authLoading };
}
