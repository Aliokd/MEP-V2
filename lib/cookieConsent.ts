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
 * Bump when the set of things we ask about changes; an old choice then re-asks.
 *
 * v1 -> v2 (2026-08-20): session replay. v1 was answered when the bar covered
 * analytics events only. Recording a session — a replay of how the page was
 * actually used — is a materially wider thing to agree to than being counted,
 * so a v1 "accept all" cannot stand in for consent to it. Everyone is asked
 * again, including anyone who previously declined, and nothing is recorded in
 * the meantime because an unanswered bar reads as no consent.
 */
const CONSENT_VERSION = 2;

/** Fired on the window so analytics can start (or stay off) without a reload. */
export const CONSENT_EVENT = 'veinote-cookie-consent-changed';

export type ConsentChoice = 'all' | 'necessary';

interface StoredConsent {
    v: number;
    choice: ConsentChoice;
    at: string;
}

/** The stored choice, or null when nobody has answered yet on this browser. */
export function readConsent(): ConsentChoice | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as StoredConsent;
        if (parsed?.v !== CONSENT_VERSION) return null;
        return parsed.choice === 'all' || parsed.choice === 'necessary' ? parsed.choice : null;
    } catch {
        // A corrupt value is treated as "not asked yet" — the safe direction,
        // since it leads to asking again rather than assuming consent.
        return null;
    }
}

/** True only on an explicit "accept all". Absence of an answer is not consent. */
export function hasAnalyticsConsent(): boolean {
    return readConsent() === 'all';
}

export function writeConsent(choice: ConsentChoice): void {
    if (typeof window === 'undefined') return;
    cachedSnapshot = choice;

    try {
        const value: StoredConsent = { v: CONSENT_VERSION, choice, at: new Date().toISOString() };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch {
        // Private mode or a full quota: the choice is still honoured for this
        // page view via the event below, it just won't be remembered.
    }

    window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
}

/**
 * Forgets the stored choice, which brings the bar back so it can be answered
 * again. Withdrawing consent has to be as easy as giving it, and the privacy
 * policy points people here.
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
export function onConsentChange(handler: (choice: ConsentChoice) => void): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, listener);
    return () => window.removeEventListener(CONSENT_EVENT, listener);
}

// --- useSyncExternalStore adapters -----------------------------------------
// Parsing localStorage on every getSnapshot call would be wasteful — React asks
// often — so the value is cached and invalidated only when it actually changes.

let cachedSnapshot: ConsentChoice | null | undefined;

export function getConsentSnapshot(): ConsentChoice | null {
    if (cachedSnapshot === undefined) cachedSnapshot = readConsent();
    return cachedSnapshot;
}

/** The server has no localStorage, and absence of an answer is not consent. */
export function getServerConsentSnapshot(): ConsentChoice | null {
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
