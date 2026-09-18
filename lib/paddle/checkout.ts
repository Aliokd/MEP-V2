"use client";

import {
    initializePaddle,
    type CheckoutEventsData,
    type Paddle,
    type PaddleEventData,
} from '@paddle/paddle-js';
import {
    BILLING_PERIODS,
    FALLBACK_PRICING,
    PADDLE_CLIENT_TOKEN,
    PADDLE_ENVIRONMENT,
    PLAN_IDS,
    getPriceId,
    isPaddleConfigured,
    type BillingPeriod,
    type PlanId,
} from './config';

/**
 * Everything the browser says to Paddle, in one place.
 *
 * Paddle.js injects a script tag, so it must only ever be initialized once per
 * page load. The promise is cached; a failed load clears it so a later attempt
 * can retry rather than being stuck with a rejected promise forever.
 *
 * Events are the one thing that has to be wired at initialization: Paddle.js
 * takes a single `eventCallback` and there is no way to add a second listener
 * later. So the library owns that callback and fans it out to whoever asked
 * (see `onPaddleEvent`). A component subscribes for as long as it is mounted
 * and the checkout it opened is the only one Paddle can have open, so nothing
 * needs to be keyed.
 */
let paddlePromise: Promise<Paddle | undefined> | null = null;

type PaddleListener = (event: PaddleEventData) => void;
const listeners = new Set<PaddleListener>();

function dispatch(event: PaddleEventData) {
    for (const listener of listeners) {
        try {
            listener(event);
        } catch (err) {
            console.error('Paddle event listener failed:', err);
        }
    }
}

export function loadPaddle(): Promise<Paddle | undefined> {
    if (!isPaddleConfigured()) return Promise.resolve(undefined);

    if (!paddlePromise) {
        paddlePromise = initializePaddle({
            environment: PADDLE_ENVIRONMENT,
            token: PADDLE_CLIENT_TOKEN,
            eventCallback: dispatch,
        }).catch((err) => {
            paddlePromise = null;
            throw err;
        });
    }

    return paddlePromise;
}

/**
 * Listens to Paddle's checkout events. Returns the unsubscribe.
 *
 * The events worth acting on are `checkout.completed` (the card went through;
 * the webhook will write the subscription to the user doc shortly after) and
 * `checkout.closed` (the overlay was dismissed without paying). Everything
 * else is telemetry.
 */
export function onPaddleEvent(listener: PaddleListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export type { PaddleEventData, CheckoutEventsData };

// Our locales happen to line up with Paddle's supported checkout locales.
const PADDLE_LOCALES: Record<string, string> = { en: 'en', no: 'no', sv: 'sv' };

/**
 * The class Paddle renders its inline checkout into, and the height it opens
 * at before its own content measures itself.
 *
 * A class rather than an id because that is what Paddle's `frameTarget` takes.
 * It lives here rather than in the component so the element being targeted and
 * the call doing the targeting can never drift apart. A typo in either one is
 * a checkout that silently renders nowhere.
 */
export const CHECKOUT_FRAME_CLASS = 'paddle-checkout-frame';
const FRAME_INITIAL_HEIGHT = 450;
// Transparent and borderless: the frame sits inside our own glass panel, and
// Paddle's default white card inside that is a card inside a card.
const FRAME_STYLE = 'width:100%; min-width:312px; background-color:transparent; border:none;';

export interface OpenCheckoutParams {
    priceId: string;
    /** Firebase uid: the only link between a Paddle customer and our user doc. */
    uid: string;
    email?: string | null;
    locale?: string;
    successUrl?: string;
    /**
     * Render into the page instead of over it. The element carrying
     * CHECKOUT_FRAME_CLASS must already be mounted when this is called;
     * Paddle looks it up once and does not retry.
     */
    inline?: boolean;
}

export async function openCheckout({ priceId, uid, email, locale, successUrl, inline }: OpenCheckoutParams): Promise<void> {
    const paddle = await loadPaddle();

    if (!paddle) {
        throw new Error('Paddle is not configured. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.');
    }

    paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        // The webhook has no other way to tie a Paddle customer back to a
        // Firebase user, so this must always be sent. See `resolveUid` in
        // app/api/paddle/webhook/route.ts.
        customData: { uid },
        ...(email ? { customer: { email } } : {}),
        settings: {
            theme: 'light',
            locale: PADDLE_LOCALES[locale ?? 'en'] ?? 'en',
            // Email, country and card on one screen. The multi-page default
            // put a "Continue" between the address and the card, a second
            // step inside a section that already sits under the plan.
            variant: 'one-page',
            // Neither is offered to a songwriter starting a trial: there are
            // no discount codes in the catalog, and VAT numbers belong to
            // businesses, which Max sells to from inside the product instead.
            // The two links sat above the form and read as things to do.
            showAddDiscounts: false,
            showAddTaxId: false,
            // The address is the account's, taken at the email step. Letting
            // the checkout swap it for another would create a Paddle customer
            // under one address for a Veinote account under a different one,
            // and every receipt would go to the wrong inbox.
            ...(email ? { allowLogout: false } : {}),
            ...(inline
                ? {
                      displayMode: 'inline' as const,
                      frameTarget: CHECKOUT_FRAME_CLASS,
                      frameInitialHeight: FRAME_INITIAL_HEIGHT,
                      frameStyle: FRAME_STYLE,
                  }
                : { displayMode: 'overlay' as const }),
            ...(successUrl ? { successUrl } : {}),
        },
    });
}

/**
 * Swaps the price in a checkout that is already open, e.g. when the billing
 * toggle is flipped with the card form showing. Paddle re-prices in place;
 * opening a second checkout on top of the first is what this avoids.
 */
export async function updateCheckoutPrice(priceId: string): Promise<void> {
    const paddle = await loadPaddle();
    paddle?.Checkout.updateItems([{ priceId, quantity: 1 }]);
}

/** Closes whatever checkout is open, if any. Safe to call when none is. */
export async function closeCheckout(): Promise<void> {
    if (!paddlePromise) return;
    const paddle = await paddlePromise.catch(() => undefined);
    try {
        paddle?.Checkout.close();
    } catch {
        // Nothing was open. Paddle throws rather than no-ops here.
    }
}

/**
 * A plan's price as the visitor will actually be charged it, in their
 * currency, expressed per month whatever the billing period.
 */
export interface LocalizedPrice {
    /** Per-month figure, formatted in the visitor's currency, e.g. "€19". */
    monthly: string;
    /** What the card is charged each period, e.g. "€228" for a yearly plan. */
    perPeriod: string;
    currencyCode: string;
}

export type LocalizedPricing = Partial<Record<PlanId, Partial<Record<BillingPeriod, LocalizedPrice>>>>;

/**
 * Asks Paddle what each configured price costs from where the visitor is.
 *
 * Paddle localizes by IP: a visitor in Stockholm sees kronor, one in Oslo
 * sees kroner, and both see whatever tax their country adds folded in. The
 * fallback figures in config are US dollars and the paywall shows them until
 * this resolves; if Paddle is not configured, or the preview fails, it stays
 * on them. Nothing here is what gets charged; the checkout itself prices the
 * transaction. This only makes the screen before it tell the truth.
 */
export async function fetchLocalizedPricing(locale: string): Promise<LocalizedPricing> {
    const paddle = await loadPaddle();
    if (!paddle) return {};

    const wanted: Array<{ plan: PlanId; period: BillingPeriod; priceId: string }> = [];
    for (const plan of PLAN_IDS) {
        for (const period of BILLING_PERIODS) {
            const priceId = getPriceId(plan, period);
            if (priceId) wanted.push({ plan, period, priceId });
        }
    }
    if (!wanted.length) return {};

    const preview = await paddle.PricePreview({
        items: wanted.map(({ priceId }) => ({ priceId, quantity: 1 })),
    });

    const currencyCode = preview.data.currencyCode;
    const result: LocalizedPricing = {};

    for (const line of preview.data.details.lineItems) {
        const match = wanted.find((w) => w.priceId === line.price.id);
        if (!match) continue;

        // Paddle hands back the amount in the currency's minor unit as a
        // string ("22800" for $228.00) alongside a ready-formatted total. The
        // per-period figure uses Paddle's own formatting; the per-month one
        // has to be computed, so it is formatted here in the same currency.
        const minor = Number(line.totals.total);
        const interval = line.price.billingCycle?.interval ?? 'month';
        const frequency = line.price.billingCycle?.frequency ?? 1;
        const monthsPerPeriod = interval === 'year' ? 12 * frequency : interval === 'month' ? frequency : 1;

        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 0,
        });
        const digits = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode })
            .resolvedOptions().maximumFractionDigits ?? 2;
        const major = minor / 10 ** digits;

        result[match.plan] = {
            ...result[match.plan],
            [match.period]: {
                monthly: formatter.format(major / monthsPerPeriod),
                perPeriod: line.formattedTotals.total,
                currencyCode,
            },
        };
    }

    return result;
}

/** The dollar fallback, in the same shape as a localized price, for the paywall's first paint. */
export function fallbackPrice(plan: PlanId, period: BillingPeriod): LocalizedPrice {
    const monthly = FALLBACK_PRICING[plan][period];
    const perPeriod = period === 'yearly' ? monthly * 12 : monthly;
    return {
        monthly: `$${monthly}`,
        perPeriod: `$${perPeriod}`,
        currencyCode: 'USD',
    };
}
