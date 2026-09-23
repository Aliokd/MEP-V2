"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { BillingPeriod, PlanId } from '@/lib/paddle/config';
import { resolveEntitlement, type Access, type AccessSource } from '@/lib/entitlement';

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
    /** The level the account is on. See lib/entitlement.ts. */
    access: Access;
    /** Why: a paid subscription, an admin grant, a trial, or nothing. */
    source: AccessSource;
    /** Pro-level surfaces (Rooms, Business): Veinote Pro, a grant, or a running trial. */
    isPro: boolean;
    /** Veinote-level or above. False only when expired or signed out. */
    isVeinote: boolean;
    /** The paid plan id, if a Paddle subscription exists: 'pro' = Veinote, 'max' = Veinote Pro. */
    plan: PlanId | null;
    /** The stored tier, for the console's benefit and for Settings' "granted" line. */
    tier: string | null;
    subscriptionStatus: string | null;
    /** Whether the access comes from a paid, entitled Paddle subscription rather than a grant or trial. */
    paid: boolean;
    trialEndsAt: string | null;
    trialDaysLeft: number | null;
    billing: BillingDetails;
    /**
     * The golden ticket this account holds, when lifetime access came with
     * one. The slug is the ticket's own page at /golden/{slug}, which is the
     * page the founders sent them.
     */
    golden: { ticket: string; invites: number } | null;
    /**
     * The account was made at the onboarding email step and the flow was
     * never finished (no code, no link from the reminder email). The
     * platform sends such an account back to /onboarding to finish.
     */
    pendingSignup: boolean;
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
    golden: null,
    pendingSignup: false,
    access: 'none',
    source: 'none',
    isPro: false,
    isVeinote: false,
    plan: null,
    tier: null,
    subscriptionStatus: null,
    paid: false,
    trialEndsAt: null,
    trialDaysLeft: null,
    billing: EMPTY_BILLING,
};

/**
 * Reads the current user's billing tier from users/{uid}.
 *
 * Live rather than one-shot so a checkout completing in the Paddle overlay flips
 * the UI as soon as the webhook lands, without a reload.
 *
 * This is a *presentation* gate: it decides what the UI offers, not what the
 * backend allows. Anything that actually costs money or exposes paid data has to
 * re-check entitlement server-side, through the same lib/entitlement.ts.
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
                const tier = typeof data.tier === 'string' ? data.tier : null;
                const subscriptionStatus = (billing.subscriptionStatus ?? null) as string | null;
                const trialEndsAt = typeof billing.trialEndsAt === 'string' ? billing.trialEndsAt : null;
                const hasSubscription = typeof billing.paddleSubscriptionId === 'string' && billing.paddleSubscriptionId.length > 0;

                const ent = resolveEntitlement({
                    tier,
                    plan: billing.plan ?? null,
                    subscriptionStatus,
                    trialEndsAt,
                    createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
                });

                const scheduled = billing.scheduledChange;
                const goldenTicket = typeof data.golden?.ticket === 'string' ? data.golden.ticket : null;

                const signup = data.signup ?? {};
                setState({
                    pendingSignup: signup.method === 'onboarding' && !signup.verifiedAt && user.emailVerified === false,
                    golden: goldenTicket
                        ? { ticket: goldenTicket, invites: typeof data.golden?.invites === 'number' ? data.golden.invites : 0 }
                        : null,
                    access: ent.access,
                    source: ent.source,
                    isPro: ent.isPro,
                    isVeinote: ent.isVeinote,
                    plan: ent.plan,
                    tier,
                    subscriptionStatus,
                    paid: ent.paid,
                    trialEndsAt: ent.trialEndsAt,
                    trialDaysLeft: ent.trialDaysLeft,
                    billing: {
                        billingPeriod: (billing.billingPeriod ?? null) as BillingPeriod | null,
                        hasSubscription,
                        trialEndsAt,
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
                // rather than handing out paid features on an error.
                console.error('[useUserPlan] Failed to read billing:', err);
                setState(EMPTY);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [user, authLoading]);

    return { ...state, loading: loading || authLoading };
}
