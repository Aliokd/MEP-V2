"use client";

/**
 * Meta Pixel (Facebook and Instagram ad measurement).
 *
 * Same contract as lib/googleAds.ts, and started by the same consent row:
 * nothing loads until "Ad measurement" is allowed, because the pixel sets the
 * _fbp advertising cookie and reports visits to Meta. AnalyticsGate is the
 * only caller of init/disable.
 *
 * Deliberately NOT the snippet Meta's setup screen hands out, for three
 * reasons. The snippet runs on every page load before anyone has answered
 * the consent dialog. Its <noscript> image fires with no consent check at
 * all. And it leaves Meta's "automatic configuration" on, which scrapes
 * button labels and page metadata into events: on a product where people
 * write lyrics, "whatever is on the page" is not something to ship to an ad
 * network. autoConfig is switched off below, before init, so the pixel only
 * ever sends the events this file names.
 *
 * No advanced matching: init is called without email or phone. The pixel
 * does not need to know who someone is to count a purchase.
 *
 * Page views after the first are Meta's own: fbevents.js listens to the
 * History API and fires PageView on App Router navigations, so none are sent
 * from here (doing both would double count).
 */
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1395982665463417';
const FBEVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[];
    push?: unknown;
    loaded?: boolean;
    version?: string;
};
type FbqWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

let started = false;
/** Tracks the current answer, which can change after the pixel has loaded. */
let granted = false;

function fbq(): Fbq | null {
    const w = window as FbqWindow;
    return typeof w.fbq === 'function' ? w.fbq : null;
}

export function initMetaPixel(): void {
    if (typeof window === 'undefined' || !META_PIXEL_ID) return;

    // Consent withdrawn and then given again in the same page load.
    if (started) {
        granted = true;
        fbq()?.('consent', 'grant');
        return;
    }
    started = true;
    granted = true;

    const w = window as FbqWindow;
    if (!w.fbq) {
        // Meta's queueing stub, as in their snippet: calls made before
        // fbevents.js arrives are queued and replayed by it in order.
        const n = function (...args: unknown[]) {
            if (n.callMethod) n.callMethod(...args);
            else n.queue!.push(args);
        } as Fbq;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        w.fbq = n;
        if (!w._fbq) w._fbq = n;

        // Inserted from bundle code, so the CSP's 'strict-dynamic' trusts it,
        // and the config script fbevents.js pulls in after it.
        const script = document.createElement('script');
        script.async = true;
        script.src = FBEVENTS_SRC;
        document.head.appendChild(script);
    }

    const f = w.fbq!;
    f('set', 'autoConfig', false, META_PIXEL_ID);
    f('init', META_PIXEL_ID);
    f('track', 'PageView');
}

/**
 * Consent withdrawn. fbevents.js cannot be unloaded, but after a revoke it
 * sends nothing further for the rest of this page load, and on the next load
 * AnalyticsGate never starts it.
 */
export function disableMetaPixel(): void {
    if (typeof window === 'undefined' || !started || !granted) return;
    granted = false;
    fbq()?.('consent', 'revoke');
}

/**
 * A Paddle checkout completed. Called from lib/paddle/checkout.ts alongside
 * the Google conversion.
 *
 * Two different events, because Meta has a name for each and they are
 * different things to optimise for. A real charge is a Purchase, with the
 * amount and currency Meta requires on that event. A card-required trial
 * charges nothing on the day, so it is a StartTrial instead: sending it as a
 * Purchase of 0 would teach Meta's bidding that the conversion is worthless,
 * and Purchase without a value is flagged as malformed in Events Manager.
 *
 * eventID is the Paddle transaction id, so if a server-side Conversions API
 * send is ever added for the same purchase, Meta dedupes the pair instead of
 * counting two.
 */
export function reportMetaCheckout(args: { transactionId: string; total: number; currency: string }): void {
    if (typeof window === 'undefined' || !granted) return;
    const f = fbq();
    if (!f) return;
    const options = { eventID: args.transactionId };
    if (args.total > 0) {
        f('track', 'Purchase', { value: args.total, currency: args.currency }, options);
    } else {
        f('track', 'StartTrial', { currency: args.currency }, options);
    }
}
