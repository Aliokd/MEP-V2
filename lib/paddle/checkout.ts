"use client";

import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { PADDLE_CLIENT_TOKEN, PADDLE_ENVIRONMENT, isPaddleConfigured } from './config';

// Paddle.js injects a script tag, so it must only ever be initialized once per
// page load. The promise is cached; a failed load clears it so a later attempt
// can retry rather than being stuck with a rejected promise forever.
let paddlePromise: Promise<Paddle | undefined> | null = null;

export function loadPaddle(): Promise<Paddle | undefined> {
    if (!isPaddleConfigured()) return Promise.resolve(undefined);

    if (!paddlePromise) {
        paddlePromise = initializePaddle({
            environment: PADDLE_ENVIRONMENT,
            token: PADDLE_CLIENT_TOKEN,
        }).catch((err) => {
            paddlePromise = null;
            throw err;
        });
    }

    return paddlePromise;
}

// Our locales happen to line up with Paddle's supported checkout locales.
const PADDLE_LOCALES: Record<string, string> = { en: 'en', no: 'no', sv: 'sv' };

/**
 * The class Paddle renders its inline checkout into, and the height it opens
 * at before its own content measures itself.
 *
 * A class rather than an id because that is what Paddle's `frameTarget` takes.
 * It lives here rather than in the component so the element being targeted and
 * the call doing the targeting can never drift apart — a typo in either one is
 * a checkout that silently renders nowhere.
 */
export const CHECKOUT_FRAME_CLASS = 'paddle-checkout-frame';
const FRAME_INITIAL_HEIGHT = 450;
// Transparent and borderless: the frame sits inside our own glass panel, and
// Paddle's default white card inside that is a card inside a card.
const FRAME_STYLE = 'width:100%; min-width:312px; background-color:transparent; border:none;';

export interface OpenCheckoutParams {
    priceId: string;
    /** Firebase uid — the only link between a Paddle customer and our user doc. */
    uid: string;
    email?: string | null;
    locale?: string;
    successUrl?: string;
    /**
     * Render into the page instead of over it. The element carrying
     * CHECKOUT_FRAME_CLASS must already be mounted when this is called —
     * Paddle looks it up once and does not retry.
     */
    inline?: boolean;
}

export async function openCheckout({ priceId, uid, email, locale, successUrl, inline }: OpenCheckoutParams): Promise<void> {
    const paddle = await loadPaddle();

    if (!paddle) {
        throw new Error('Paddle is not configured — set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.');
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
