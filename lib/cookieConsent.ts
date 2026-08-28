"use client";

/**
 * Cookie consent, stored per browser.
 *
 * Deliberately NOT account-scoped: consent belongs to the device and the person
 * sitting at it, not to whoever is signed in, so this key stays out of
 * ACCOUNT_SCOPED_KEYS in lib/storage.ts and survives account switches. Someone
 * who declined analytics must not find them re-enabled by signing in.
 */

const CONSENT_KEY = 'veinote-cookie-consent';
/**
 * Bump when the set of things we ask about WIDENS; an old answer then re-asks.
 *
 * v1 -> v2 (2026-08-20): session replay. v1 was answered when the bar covered
 * analytics events only. Recording a session — a replay of how the page was
 * actually used — is a materially wider thing to agree to than being counted,
 * so a v1 "accept all" could not stand in for consent to it.
 *
 * v2 -> v3 (2026-08-28): the single accept/decline became one row per thing we
 * actually run. Nothing new is being asked about — v2 already covered both
 * analytics and replay — so a v2 answer is migrated rather than discarded. It
 * said yes or no to exactly this pair, and re-asking someone a question they
 * have already answered is its own kind of dark pattern.
 */
const CONSENT_VERSION = 3;

/** Fired on the window so analytics can start (or stay off) without a reload. */
export const CONSENT_EVENT = 'veinote-cookie-consent-changed';

/**
 * The categories the settings panel asks about.
 *
 * There are three because there are three real things, and no more: what has to
 * run for the site to work, being counted, and being recorded. A "marketing"
 * row would be theatre — Veinote serves no ads and sets no advertising cookies
 * — and a row nobody can act on teaches people the whole panel is decoration.
 *
 * Analytics and replay are split because the privacy policy splits them: being
 * counted and having a session played back are different asks, and someone can
 * reasonably say yes to the first and no to the second.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'replay';

export interface ConsentState {
    /** Sign-in, security, saved work, and this answer itself. Never optional. */
    necessary: true;
    /** PostHog's identified tier and Firebase Analytics. */
    analytics: boolean;
    /** PostHog session replay and Microsoft Clarity. */
    replay: boolean;
}

interface StoredConsent {
    v: number;
    analytics: boolean;
    replay: boolean;
    at: string;
}

/** Frozen, so the two common answers keep one identity across renders. */
export const ACCEPT_ALL: ConsentState = Object.freeze({ necessary: true, analytics: true, replay: true });
export const NECESSARY_ONLY: ConsentState = Object.freeze({ necessary: true, analytics: false, replay: false });

/**
 * Replay implies analytics, so an inconsistent pair is resolved rather than
 * stored. Being recorded but never counted is not a state anyone asks for, the
 * panel doesn't offer it, and honouring it would mean carrying a tier through
 * lib/posthog.ts that exists only to satisfy a shape.
 */
export function normalizeConsent(state: { analytics: boolean; replay: boolean }): ConsentState {
    const analytics = Boolean(state.analytics);
    return { necessary: true, analytics, replay: analytics && Boolean(state.replay) };
}

/** The stored answer, or null when nobody has answered yet on this browser. */
export function readConsent(): ConsentState | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<StoredConsent> & { choice?: string };

        // A v2 answer: one word standing for both categories at once.
        if (parsed?.v === 2) {
            return parsed.choice === 'all' ? ACCEPT_ALL : parsed.choice === 'necessary' ? NECESSARY_ONLY : null;
        }

        if (parsed?.v !== CONSENT_VERSION) return null;
        return normalizeConsent({ analytics: !!parsed.analytics, replay: !!parsed.replay });
    } catch {
        // A corrupt value is treated as "not asked yet" — the safe direction,
        // since it leads to asking again rather than assuming consent.
        return null;
    }
}

/** True only on an explicit yes to being counted. Absence of an answer is not consent. */
export function hasAnalyticsConsent(): boolean {
    return readConsent()?.analytics === true;
}

/** True only on an explicit yes to being recorded. */
export function hasReplayConsent(): boolean {
    return readConsent()?.replay === true;
}

export function writeConsent(state: { analytics: boolean; replay: boolean }): ConsentState {
    const next = normalizeConsent(state);
    if (typeof window === 'undefined') return next;

    // Cached as the exact object about to be published, so the store snapshot
    // and every reader agree on one identity for this answer.
    cachedSnapshot = next;

    try {
        const value: StoredConsent = {
            v: CONSENT_VERSION,
            analytics: next.analytics,
            replay: next.replay,
            at: new Date().toISOString(),
        };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch {
        // Private mode or a full quota: the choice is still honoured for this
        // page view via the event below, it just won't be remembered.
    }

    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: next }));
    return next;
}

export const acceptAllCookies = (): ConsentState => writeConsent(ACCEPT_ALL);
export const rejectOptionalCookies = (): ConsentState => writeConsent(NECESSARY_ONLY);

/**
 * Forgets the stored answer, which brings the consent bar back so it can be
 * given again from scratch. Kept alongside the settings panel rather than
 * replaced by it: "ask me again" is a different intent from "here is my new
 * answer", and the privacy policy points people at both.
 */
export function clearConsent(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(CONSENT_KEY);
    } catch {
        /* nothing stored is the same outcome */
    }
    cachedSnapshot = null;
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onConsentChange(handler: (state: ConsentState | null) => void): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<ConsentState | null>).detail);
    window.addEventListener(CONSENT_EVENT, listener);
    return () => window.removeEventListener(CONSENT_EVENT, listener);
}

// --- useSyncExternalStore adapters -----------------------------------------
// Parsing localStorage on every getSnapshot call would be wasteful — React asks
// often — and now that the answer is an object it would also hand back a fresh
// identity every time, which is an infinite render loop rather than a waste. So
// the value is cached and invalidated only when it actually changes.

let cachedSnapshot: ConsentState | null | undefined;

export function getConsentSnapshot(): ConsentState | null {
    if (cachedSnapshot === undefined) cachedSnapshot = readConsent();
    return cachedSnapshot;
}

/** The server has no localStorage, and absence of an answer is not consent. */
export function getServerConsentSnapshot(): ConsentState | null {
    return null;
}

export function subscribeConsent(onStoreChange: () => void): () => void {
    const handle = () => {
        cachedSnapshot = readConsent();
        onStoreChange();
    };
    window.addEventListener(CONSENT_EVENT, handle);
    // 'storage' fires in *other* tabs: answering in one tab settles them all,
    // rather than leaving a stale bar sitting on every other open page.
    window.addEventListener('storage', handle);
    return () => {
        window.removeEventListener(CONSENT_EVENT, handle);
        window.removeEventListener('storage', handle);
    };
}
