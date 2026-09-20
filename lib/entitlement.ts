import { isEntitled, TRIAL_DAYS, type PlanId } from './paddle/config';

/**
 * What an account may use, decided in one place.
 *
 * Three tiers face the user: Trial, Veinote and Veinote Pro. Internally the
 * plan ids are older than the names ('pro' is the Veinote plan, 'max' is
 * Pro) and are kept, because they are wired into Paddle price ids, the
 * webhook and every stored user document.
 *
 * Two things can put an account on a level, and they must agree:
 *
 *   - a Paddle subscription, written into `billing` by the webhook and
 *     checked for entitlement (active, trialing, past_due);
 *   - `tier`, which the admin console sets and the webhook keeps in step.
 *     "pro" and "max" are grants of the two plans, "comp" is a lifetime
 *     Pro grant (the golden program), "trial" is the tier every account is
 *     born with, and "free" is what the webhook writes once a subscription
 *     has lapsed.
 *
 * A trial is time-boxed by `billing.trialEndsAt`. Onboarding stamps it at
 * signup, the console can move it, and a Paddle trial overwrites it with
 * Paddle's own date. Past that date, with no paid or granted plan, the
 * account is `expired`: the platform shows the plans instead of the canvas.
 *
 * Both the browser hook (lib/useUserPlan.ts) and the server read through
 * this function, so the console, the paywall and the platform can never
 * disagree about who is in.
 */

export type Tier = 'trial' | 'free' | 'pro' | 'max' | 'comp';

/** The level of access, highest first. `trial` is Pro-level access with an end date. */
export type Access = 'pro' | 'veinote' | 'trial' | 'expired' | 'none';

export type AccessSource = 'paid' | 'granted' | 'trial' | 'none';

export interface EntitlementInput {
    tier?: string | null;
    plan?: string | null;
    subscriptionStatus?: string | null;
    trialEndsAt?: string | null;
    /** ISO string or epoch millis; only read when trialEndsAt is missing. */
    createdAt?: string | number | null;
    now?: number;
}

export interface Entitlement {
    access: Access;
    /** Where the access comes from. */
    source: AccessSource;
    /** Pro-level features (Rooms, Business): the upper plan, a grant, or a trial. */
    isPro: boolean;
    /** Veinote-level features or above: everything but the Pro surfaces. */
    isVeinote: boolean;
    /** True while a paid Paddle subscription is the reason for the access. */
    paid: boolean;
    /** The plan a paid subscription is on, whatever its status. */
    plan: PlanId | null;
    /** When the trial ends, for accounts on one (ISO), else null. */
    trialEndsAt: string | null;
    /** Whole days left on the trial, never negative; null when not on a trial. */
    trialDaysLeft: number | null;
}

const DAY = 24 * 60 * 60 * 1000;

function parseTime(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
}

/** ISO date of the trial an account is given at birth, TRIAL_DAYS from now. */
export function defaultTrialEnd(days: number = TRIAL_DAYS, from: number = Date.now()): string {
    return new Date(from + days * DAY).toISOString();
}

export function resolveEntitlement(input: EntitlementInput): Entitlement {
    const now = input.now ?? Date.now();
    const tier = (input.tier ?? null) as Tier | null;
    const plan = input.plan === 'pro' || input.plan === 'max' ? input.plan : null;
    const status = input.subscriptionStatus ?? null;

    const entitled = isEntitled(status) && plan !== null;

    // A Paddle trial is the subscription's own: it is entitled, and Paddle
    // writes its end date. It is shown as a trial, with Pro-level access,
    // rather than as the plan it will become, so the person tries everything.
    if (entitled && status === 'trialing') {
        const ends = input.trialEndsAt ?? null;
        return {
            access: 'trial',
            source: 'trial',
            isPro: true,
            isVeinote: true,
            paid: true,
            plan,
            trialEndsAt: ends,
            trialDaysLeft: daysLeft(ends, now),
        };
    }

    if (entitled) {
        const isPro = plan === 'max';
        return {
            access: isPro ? 'pro' : 'veinote',
            source: 'paid',
            isPro,
            isVeinote: true,
            paid: true,
            plan,
            trialEndsAt: null,
            trialDaysLeft: null,
        };
    }

    // Grants. Server-written only (the rules refuse `tier` from a client).
    if (tier === 'max' || tier === 'comp') {
        return { access: 'pro', source: 'granted', isPro: true, isVeinote: true, paid: false, plan, trialEndsAt: null, trialDaysLeft: null };
    }
    if (tier === 'pro') {
        return { access: 'veinote', source: 'granted', isPro: false, isVeinote: true, paid: false, plan, trialEndsAt: null, trialDaysLeft: null };
    }

    // A subscription that lapsed: the webhook wrote tier "free". No trial is
    // owed to an account that has already had a plan.
    if (tier === 'free') {
        return { access: 'expired', source: 'none', isPro: false, isVeinote: false, paid: false, plan, trialEndsAt: null, trialDaysLeft: null };
    }

    // The trial. An account with no end date on file is one made before the
    // date was stamped at signup; it is treated as still on its trial rather
    // than thrown out, and the console lists it as needing an end date.
    const ends = input.trialEndsAt ?? null;
    const endsAt = parseTime(ends);
    if (endsAt === null) {
        return { access: 'trial', source: 'trial', isPro: true, isVeinote: true, paid: false, plan, trialEndsAt: null, trialDaysLeft: null };
    }
    if (endsAt > now) {
        return { access: 'trial', source: 'trial', isPro: true, isVeinote: true, paid: false, plan, trialEndsAt: ends, trialDaysLeft: daysLeft(ends, now) };
    }
    return { access: 'expired', source: 'none', isPro: false, isVeinote: false, paid: false, plan, trialEndsAt: ends, trialDaysLeft: 0 };
}

function daysLeft(iso: string | null, now: number): number | null {
    const t = parseTime(iso);
    if (t === null) return null;
    return Math.max(0, Math.ceil((t - now) / DAY));
}

/** The user-facing name of a level, for the console and for badges. */
export const ACCESS_LABELS: Record<Access, string> = {
    pro: 'Veinote Pro',
    veinote: 'Veinote',
    trial: 'Trial',
    expired: 'Expired',
    none: 'No access',
};

/** The user-facing name of a plan id. */
export const PLAN_LABELS: Record<PlanId, string> = {
    pro: 'Veinote',
    max: 'Veinote Pro',
};
