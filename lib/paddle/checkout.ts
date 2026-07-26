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

export interface OpenCheckoutParams {
    priceId: string;
    /** Firebase uid — the only link between a Paddle customer and our user doc. */
    uid: string;
    email?: string | null;
    locale?: string;
    successUrl?: string;
}

export async function openCheckout({ priceId, uid, email, locale, successUrl }: OpenCheckoutParams): Promise<void> {
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
            displayMode: 'overlay',
            theme: 'light',
            locale: PADDLE_LOCALES[locale ?? 'en'] ?? 'en',
            ...(successUrl ? { successUrl } : {}),
        },
    });
}
