import posthog from 'posthog-js';

/**
 * PostHog product analytics, in two tiers.
 *
 * Anonymous tier (everyone, no consent needed): initialised with
 * `persistence: 'memory'`, so nothing — no cookie, no localStorage entry — is
 * ever written to the device. That storage-free property is the entire legal
 * basis for running before consent (ePrivacy's consent requirement attaches to
 * storing or reading data on the device), so nothing in this tier may touch
 * storage, identify anyone, or record sessions. Identity lasts exactly one
 * page-session and is gone when the tab closes: the same person tomorrow is a
 * new visitor, by design. What it yields is aggregate traffic — pageviews,
 * referrers, device class, country.
 *
 * Full tier (after "Accept all" in the consent bar): persistence moves to
 * localStorage+cookie, identity survives across visits, identify() ties events
 * to the account, and session replay starts. AnalyticsGate is the only caller
 * of the upgrade/downgrade pair.
 *
 * Both env values are inlined into the browser bundle at build time. When
 * either is missing the whole integration turns itself off rather than
 * half-initialising: local dev, CI and preview deploys then run with no
 * analytics instead of posting into the production project. The host must
 * match the project's region (https://eu.i.posthog.com for this one) — the
 * wrong region fails silently.
 */
// Defaulted in source, like Clarity's project id in AnalyticsGate, because the
// env route never actually reached production: NEXT_PUBLIC_* values are inlined
// at build time, the deploy workflow writes only the server secrets into .env,
// and so every prod build shipped with PostHog silently off. These are public
// write-only tokens — they sit in the served bundle by design — so source is
// where they belong. Env still overrides, which is how a fork or a second
// project points elsewhere.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_uNXWvwU4j3NfZDTyCQRSg9evK2SnL9WTyazigET9YmHw';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export const isPostHogConfigured = Boolean(POSTHOG_KEY && POSTHOG_HOST);

/** React 18 runs effects twice in dev; init is not idempotent, so gate it. */
let initialised = false;
/** True only between enableFullTracking() and disableFullTracking(). */
let fullTracking = false;

export function initPostHog(): void {
    if (!isPostHogConfigured || initialised || typeof window === 'undefined') return;
    initialised = true;

    posthog.init(POSTHOG_KEY!, {
        api_host: POSTHOG_HOST!,
        // The anonymous tier's load-bearing line. Never change this default:
        // consent upgrades it at runtime via enableFullTracking().
        persistence: 'memory',
        // Replay is consent-only. Enabled at runtime by enableFullTracking();
        // this flag is what keeps it off for the anonymous tier even though
        // the PostHog project has it switched on.
        disable_session_recording: true,
        /*
         * 'history_change' makes posthog-js watch the History API itself.
         *
         * The usual App Router recipe is an effect over usePathname() +
         * useSearchParams(), but useSearchParams() opts its whole subtree out of
         * static rendering — mounted this high in the tree that would turn every
         * prerendered page in the app dynamic. Letting the SDK observe history
         * instead records the same client-side navigations and keeps the pages
         * static.
         */
        capture_pageview: 'history_change',
        capture_pageleave: true,
        /*
         * Anonymous visitors still send events — they just don't each create a
         * billable person profile. Profiles are created on identify() after
         * consent, which is the point at which a visitor becomes a person we
         * can actually follow across sessions.
         */
        person_profiles: 'identified_only',
        /*
         * Masking config for when replay runs (full tier only). Pinned here
         * rather than left to the SDK default, which is a moving target across
         * versions.
         *
         * Masking matters more here than in a typical app: what users write in
         * this product is original song lyrics. That is their creative work
         * — the thing the privacy policy promises we do not mine — so it must
         * not end up sitting in a replay archive. maskAllInputs alone was not
         * enough: it hides what is being *typed*, but lyrics are also *displayed*
         * — committed lines on the Create canvas, published songs in the Connect
         * feed — and rendered DOM text goes into a recording unmasked. So all
         * text is masked, full stop: maskTextSelector '*' is this SDK's "mask
         * all text", and client-side config deliberately wins over the PostHog
         * dashboard's masking setting, so nobody can weaken this from the
         * console. The privacy policy states recordings never contain lyrics or
         * other creative content; this selector is what makes that sentence
         * true, and narrowing it is a policy change, not a config tweak.
         * Everything that makes replay useful (navigation, clicks, hesitation,
         * rage-clicks, layout) is unaffected.
         */
        session_recording: {
            maskAllInputs: true,
            maskTextSelector: '*',
        },
    });
}

/**
 * One product event, from either tier. In the anonymous tier this is the whole
 * point of having PostHog at all: events carry no identity and touch no
 * storage, so they are covered by the same legal basis as the anonymous
 * pageviews — which means funnel steps get counted for every visitor, not
 * just the ones who accepted cookies. No-ops when PostHog is off (local dev
 * without the env override reaching init, SSR).
 */
export function capture(event: string, properties?: Record<string, unknown>): void {
    if (!isPostHogConfigured || !initialised) return;
    try {
        posthog.capture(event, properties);
    } catch (err) {
        console.error('PostHog capture failed:', err);
    }
}

/**
 * Upgrade to the full tier after "Accept all": durable identity and session
 * replay. Events from the anonymous tier stay orphaned — the memory-mode id is
 * random and was never written anywhere, so there is nothing to stitch to.
 * That is the promise of the anonymous tier, not a bug to fix.
 */
export function enableFullTracking(): void {
    if (!isPostHogConfigured || !initialised || fullTracking) return;
    fullTracking = true;
    try {
        posthog.set_config({
            persistence: 'localStorage+cookie',
            disable_session_recording: false,
        });
        posthog.startSessionRecording();
    } catch (err) {
        console.error('PostHog full-tracking upgrade failed:', err);
    }
}

/**
 * Back to the anonymous tier when consent is withdrawn (the privacy page's
 * "Cookie settings" can clear or change the stored choice). reset() drops the
 * identity and device id; moving persistence back to memory stops anything
 * further from being written.
 */
export function disableFullTracking(): void {
    if (!isPostHogConfigured || !initialised || !fullTracking) return;
    fullTracking = false;
    try {
        posthog.stopSessionRecording();
        posthog.reset();
        posthog.set_config({
            persistence: 'memory',
            disable_session_recording: true,
        });
    } catch (err) {
        console.error('PostHog downgrade failed:', err);
    }
}

/**
 * Ties subsequent events to a real account. Safe to call repeatedly; PostHog
 * ignores an identify for the id that is already current.
 */
export function identifyPostHogUser(
    uid: string,
    traits: { email?: string | null; name?: string | null },
): void {
    // Full tier only. The anonymous tier's promise is that nobody is named to
    // it — an identify before consent would break exactly that.
    if (!isPostHogConfigured || !fullTracking) return;
    try {
        posthog.identify(uid, {
            ...(traits.email ? { email: traits.email } : {}),
            ...(traits.name ? { name: traits.name } : {}),
        });
    } catch (err) {
        console.error('PostHog identify failed:', err);
    }
}

/**
 * Ends the identified session on sign-out. Without this the next person to use
 * the same browser inherits the previous account's distinct id, and their
 * events are attributed to someone else.
 */
export function resetPostHogUser(): void {
    if (!isPostHogConfigured || !fullTracking) return;
    try {
        posthog.reset();
    } catch (err) {
        console.error('PostHog reset failed:', err);
    }
}
