"use client";

/**
 * Google Ads conversion measurement (the Google tag, gtag.js).
 *
 * Loaded only after the marketing category is allowed in the consent panel,
 * never before: the tag sets advertising cookies (_gcl_au) and reports visits
 * to Google, and there is no storage-free mode to fall back on the way PostHog
 * has one. AnalyticsGate is the only caller.
 *
 * This is Google's "basic" Consent Mode: nothing loads until there is a yes,
 * and when it loads the consent signals it sends match that yes exactly.
 * ad_storage and ad_user_data are granted because measuring a conversion is
 * the thing that was agreed to. ad_personalization stays denied: Google is
 * the one ad platform that lets us refuse remarketing (showing Veinote ads to
 * people because they visited), so we do. The Meta Pixel has no equivalent,
 * which is why the consent row describes the platforms' own use of the data.
 *
 * Coexists with Firebase Analytics, which drives the same gtag.js and the same
 * window.dataLayer: whichever arrives first inserts the script and the other
 * reuses it. The `l=dataLayer` in the src is what lets Firebase recognise our
 * copy (it only matches scripts naming its dataLayer), so the library is never
 * loaded twice onto one queue.
 *
 * The id is public by design (it ships in every page's source), so it is
 * defaulted here like the PostHog key; the env var overrides it.
 */
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18402018306';
const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js';

type Gtag = (...args: unknown[]) => void;
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

let started = false;
/** Tracks the current answer, which can change after the tag has loaded. */
let granted = false;

function gtag(): Gtag | null {
    const w = window as GtagWindow;
    return typeof w.gtag === 'function' ? w.gtag : null;
}

export function initGoogleAds(): void {
    if (typeof window === 'undefined' || !GOOGLE_ADS_ID) return;

    const w = window as GtagWindow;

    // A withdrawal followed by a new yes in the same page load: the tag is
    // already running, so the only thing to do is say so.
    if (started) {
        granted = true;
        gtag()?.('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted' });
        return;
    }
    started = true;
    granted = true;

    w.dataLayer = w.dataLayer || [];
    if (typeof w.gtag !== 'function') {
        // The stock gtag shim. It must push `arguments` itself, not a copied
        // array: gtag.js tells commands from plain data by that shape.
        w.gtag = function gtagShim() {
            // eslint-disable-next-line prefer-rest-params
            w.dataLayer!.push(arguments);
        };
    }
    const g = w.gtag!;

    // Before config, so the very first hit already carries the signals.
    g('consent', 'default', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'denied',
    });

    const alreadyLoaded = Array.from(document.scripts).some((s) => s.src.startsWith(GTAG_SRC));
    if (!alreadyLoaded) {
        // Inserted from bundle code, so the CSP's 'strict-dynamic' trusts it
        // the same way it trusts Firebase's own insertion of this script.
        const script = document.createElement('script');
        script.async = true;
        script.src = `${GTAG_SRC}?id=${encodeURIComponent(GOOGLE_ADS_ID)}&l=dataLayer`;
        document.head.appendChild(script);
        g('js', new Date());
    }

    g('config', GOOGLE_ADS_ID);
}

/**
 * Consent to marketing was withdrawn. gtag.js cannot be unloaded, so it is
 * told to stop: with ad_storage denied it neither reads nor writes its
 * cookies for the rest of this page load, and on the next load AnalyticsGate
 * simply never starts it.
 */
export function disableGoogleAds(): void {
    if (typeof window === 'undefined' || !started || !granted) return;
    granted = false;
    gtag()?.('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied' });
}

/**
 * Report one conversion to Google Ads. `label` is the part after the slash in
 * the conversion action's send_to ("AW-18402018306/<label>"), shown in Google
 * Ads under Goals > Conversions > the action > Tag setup. No-op unless the
 * tag is running, so call sites never need their own consent check.
 */
export function trackAdsConversion(label: string, params: Record<string, unknown> = {}): void {
    if (typeof window === 'undefined' || !granted) return;
    gtag()?.('event', 'conversion', { send_to: `${GOOGLE_ADS_ID}/${label}`, ...params });
}

/** The "Purchase" conversion action in Google Ads. */
const PURCHASE_LABEL = 'yhOdCLjE_v8cEIKI4sZE';

/**
 * A Paddle checkout completed. Called from lib/paddle/checkout.ts, which sees
 * every checkout on the site, so no individual paywall has to remember this.
 *
 * transaction_id is what lets Google count one purchase once: Paddle can
 * report a completion more than once (a retry, a second tab), and Google
 * dedupes on this id. Deliberately no `value`: with card-required trials the
 * charge on the day is usually zero, and sending value: 0 would override the
 * value set on the conversion action and tell bidding a trial is worth
 * nothing. The action's own value settings in Google Ads are the source of
 * truth until real revenue per conversion is worth wiring.
 */
export function reportPurchaseConversion(transactionId: string): void {
    trackAdsConversion(PURCHASE_LABEL, { transaction_id: transactionId });
}
