// Shared Paddle configuration.
//
// Safe to import from both client and server: it only reads NEXT_PUBLIC_* vars.
// The secrets (PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET) are read directly inside
// the webhook route and never reach the browser.

export type BillingPeriod = 'yearly' | 'monthly';
export type PlanId = 'pro' | 'max';

export const PLAN_IDS: PlanId[] = ['pro', 'max'];
export const BILLING_PERIODS: BillingPeriod[] = ['yearly', 'monthly'];

// Days of premium access granted before the first charge.
export const TRIAL_DAYS = 3;

// Fallback display prices, as the monthly figure for each billing period.
// Paddle becomes the source of truth once price ids are configured — these keep
// the paywall reviewable without Paddle credentials and render as the initial
// value before a localized price is fetched.
//
// NOTE: only pro/yearly ($19) is confirmed. The other three are placeholders
// awaiting real pricing — change them here, nowhere else.
export const FALLBACK_PRICING: Record<PlanId, Record<BillingPeriod, number>> = {
    pro: { yearly: 19, monthly: 23 },
    max: { yearly: 39, monthly: 47 },
};

// Next inlines NEXT_PUBLIC_* at build time, so every var has to be referenced
// literally here — a computed `process.env[key]` lookup would resolve to
// undefined in the browser bundle.
export const PADDLE_PRICE_IDS: Record<PlanId, Record<BillingPeriod, string>> = {
    pro: {
        yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY ?? '',
        monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY ?? '',
    },
    max: {
        yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MAX_YEARLY ?? '',
        monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MAX_MONTHLY ?? '',
    },
};

export const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';

// Anything other than an explicit "production" stays on sandbox, so a missing or
// misspelled env var can never accidentally take real payments.
export const PADDLE_ENVIRONMENT: 'sandbox' | 'production' =
    process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' ? 'production' : 'sandbox';

export function getPriceId(plan: PlanId, period: BillingPeriod): string | null {
    return PADDLE_PRICE_IDS[plan][period] || null;
}

export function isPaddleConfigured(): boolean {
    return PADDLE_CLIENT_TOKEN.length > 0;
}

/** A plan can only be bought when Paddle is live *and* that price id is set. */
export function isPlanPurchasable(plan: PlanId, period: BillingPeriod): boolean {
    return isPaddleConfigured() && getPriceId(plan, period) !== null;
}

/** Reverse lookup — turns a Paddle price id from a webhook back into our plan. */
export function planFromPriceId(priceId: string): { plan: PlanId; period: BillingPeriod } | null {
    for (const plan of PLAN_IDS) {
        for (const period of BILLING_PERIODS) {
            if (PADDLE_PRICE_IDS[plan][period] === priceId) return { plan, period };
        }
    }
    return null;
}

// Paddle subscription statuses that should grant access to the platform.
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function isEntitled(subscriptionStatus: string | null | undefined): boolean {
    return ENTITLED_STATUSES.has(subscriptionStatus ?? '');
}
