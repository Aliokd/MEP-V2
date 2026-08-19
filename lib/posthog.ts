import posthog from 'posthog-js';

/**
 * PostHog product analytics.
 *
 * Both values are inlined into the browser bundle at build time. When either is
 * missing the whole integration turns itself off rather than half-initialising:
 * local dev, CI and preview deploys then run with no analytics instead of
 * throwing, or worse, posting real events into the production project.
 *
 * The host must match the region the PostHog project was created in
 * (https://eu.i.posthog.com or https://us.i.posthog.com) — pointing at the wrong
 * one fails silently, since the other region simply has no such project.
 */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(POSTHOG_KEY && POSTHOG_HOST);

/** React 18 runs effects twice in dev; init is not idempotent, so gate it. */
let initialised = false;

export function initPostHog(): void {
    if (!isPostHogConfigured || initialised || typeof window === 'undefined') return;
    initialised = true;

    posthog.init(POSTHOG_KEY!, {
        api_host: POSTHOG_HOST!,
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
         * billable person profile. Profiles are created on identify() at
         * sign-in, which is the point at which a visitor becomes a person we can
         * actually follow across sessions.
         */
        person_profiles: 'identified_only',
        /*
         * Session replay is enabled in the PostHog project, deliberately — we
         * want to watch real sessions. Masking is pinned here rather than left
         * to the SDK default, which is a moving target across versions.
         *
         * maskAllInputs matters more here than in a typical app: what users type
         * into this product is original song lyrics. That is their creative work
         * — the thing the privacy policy promises we do not mine — so it must
         * not end up sitting in a replay archive. Everything that makes replay
         * useful (navigation, clicks, hesitation, rage-clicks) is unaffected;
         * only the literal characters typed into fields are obscured.
         */
        session_recording: {
            maskAllInputs: true,
        },
    });
}

/**
 * Ties subsequent events to a real account. Safe to call repeatedly; PostHog
 * ignores an identify for the id that is already current.
 */
export function identifyPostHogUser(
    uid: string,
    traits: { email?: string | null; name?: string | null },
): void {
    // `initialised` doubles as the consent check: init only ever happens after
    // an explicit "accept all" (see AnalyticsGate), so identifying before it
    // would mean naming a person to an SDK they never agreed to.
    if (!isPostHogConfigured || !initialised) return;
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
    if (!isPostHogConfigured || !initialised) return;
    try {
        posthog.reset();
    } catch (err) {
        console.error('PostHog reset failed:', err);
    }
}
