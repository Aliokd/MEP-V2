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
 *
 * v3 -> v4 (2026-09-23): marketing, for the Google Ads tag. This one widens
 * the ask, which by the rule above would mean re-asking, but it is migrated
 * instead: a v2/v3 answer keeps its analytics and replay and reads as
 * marketing: false. Nobody who answered before was asked about advertising, so
 * nothing they said can stand in for a yes. And re-asking buys nothing: the
 * conversions the tag exists to measure come from people arriving off an ad,
 * who have no stored answer and meet the full question on their first visit.
 * Asking everyone already here to also allow advertising would be badgering
 * for no measurement at all.
 *
 * v4 -> v5 (2026-09-24): the Meta Pixel joins Google Ads under the same row.
 * A v4 yes to ad measurement was a yes to Google, with a promise that the data
 * would not be used to show ads based on the visit; Meta offers no switch to
 * keep that promise, so the row now says what Meta does instead, and a v4 yes
 * cannot stand in for agreeing to it. Exactly those answers are asked again.
 * Everyone else carries over untouched: a v4 no is still a no (the wider ask
 * only makes it more so), and v2/v3 answers never allowed marketing at all.
 */
const CONSENT_VERSION = 5;

/** Fired on the window so analytics can start (or stay off) without a reload. */
export const CONSENT_EVENT = 'veinote-cookie-consent-changed';

/**
 * The categories the settings panel asks about.
 *
 * One row per real thing, and no more: what has to run for the site to work,
 * being counted, being recorded, and ad measurement. Marketing was left out
 * while Veinote set no advertising cookies, because a row nobody can act on
 * teaches people the whole panel is decoration. The Google Ads tag
 * (lib/googleAds.ts) made it a real thing, so it is a row now, and the Meta
 * Pixel (lib/metaPixel.ts) shares it. Veinote still shows no ads; this is
 * about measuring the ads Veinote runs elsewhere.
 *
 * Analytics and replay are split because the privacy policy splits them: being
 * counted and having a session played back are different asks, and someone can
 * reasonably say yes to the first and no to the second. Marketing is
 * independent of both: it goes to a different company for a different purpose,
 * so neither answer implies the other.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'replay' | 'marketing';

export interface ConsentState {
    /** Sign-in, security, saved work, and this answer itself. Never optional. */
    necessary: true;
    /** PostHog's identified tier and Firebase Analytics. */
    analytics: boolean;
    /** PostHog session replay. */
    replay: boolean;
    /** Ad measurement: Google Ads (lib/googleAds.ts) and the Meta Pixel (lib/metaPixel.ts). */
    marketing: boolean;
}

interface StoredConsent {
    v: number;
    analytics: boolean;
    replay: boolean;
    /** Absent on v3 answers, which never asked about it. */
    marketing?: boolean;
    at: string;
}

/** What writeConsent and normalizeConsent take: the three optional answers. */
export type ConsentAnswer = { analytics: boolean; replay: boolean; marketing: boolean };

/**
 * Answers that allowed nothing optional, given before this moment, are asked
 * once more — and once only.
 *
 * The ask itself changed: it used to be a bar along the bottom edge that could
 * be dismissed by ignoring it, and a "no" collected that way is as likely to
 * mean "not now" as it is to mean no. So everyone who has not accepted anything
 * gets the new dialog once, with the categories laid out.
 *
 * Once only is the whole design. A fresh decline is stamped with the time it
 * was given, which is after this cutoff, so it is honoured from then on and
 * this code never looks at it again. Moving the date forward asks the same
 * people again — legitimate once, when what is being asked has genuinely
 * changed; done on a schedule it is badgering, and the law and the people both
 * read it that way. Anyone who allowed anything at all is never in scope.
 */
// The minute the dialog went live (f4ae30f, pushed 07:38Z and serving by
// 07:48Z), rounded up. Midnight that day was the first draft of this line, and
// it left a morning's worth of old-bar declines standing as if they had
// answered the new question.
const REASK_DECLINES_BEFORE = Date.parse('2026-08-28T08:00:00.000Z');

/** Frozen, so the two common answers keep one identity across renders. */
export const ACCEPT_ALL: ConsentState = Object.freeze({ necessary: true, analytics: true, replay: true, marketing: true });
export const NECESSARY_ONLY: ConsentState = Object.freeze({ necessary: true, analytics: false, replay: false, marketing: false });
/** A v2 "accept all": everything that existed then, which did not include marketing. */
const V2_ACCEPT_ALL: ConsentState = Object.freeze({ necessary: true, analytics: true, replay: true, marketing: false });

/**
 * Replay implies analytics, so an inconsistent pair is resolved rather than
 * stored. Being recorded but never counted is not a state anyone asks for, the
 * panel doesn't offer it, and honouring it would mean carrying a tier through
 * lib/posthog.ts that exists only to satisfy a shape. Marketing stands alone.
 */
export function normalizeConsent(state: ConsentAnswer): ConsentState {
    const analytics = Boolean(state.analytics);
    return {
        necessary: true,
        analytics,
        replay: analytics && Boolean(state.replay),
        marketing: Boolean(state.marketing),
    };
}

/**
 * True for an answer that allowed nothing and predates the re-ask cutoff, which
 * this treats as unanswered so the dialog comes back one more time. A record
 * with no readable timestamp counts as old — every one of those was written by
 * an earlier version, which is exactly the population being re-asked.
 */
function isStaleDecline(state: ConsentState, at: string | undefined): boolean {
    if (state.analytics || state.marketing) return false;
    const answeredAt = at ? Date.parse(at) : NaN;
    return Number.isNaN(answeredAt) || answeredAt < REASK_DECLINES_BEFORE;
}

/** The stored answer, or null when nobody has answered yet on this browser. */
export function readConsent(): ConsentState | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<StoredConsent> & { choice?: string };

        // A v2 answer: one word standing for both categories at once. Its
        // "all" predates marketing, so it is all of analytics and replay only.
        if (parsed?.v === 2) {
            if (parsed.choice === 'all') return V2_ACCEPT_ALL;
            if (parsed.choice !== 'necessary') return null;
            return isStaleDecline(NECESSARY_ONLY, parsed.at) ? null : NECESSARY_ONLY;
        }

        // A v4 yes to ad measurement covered Google only: asked again (see
        // CONSENT_VERSION). Returning null brings the dialog back once.
        if (parsed?.v === 4 && parsed.marketing) return null;

        // v3 never asked about marketing and a v4 answer that reaches here said
        // no to it, so both read as a no.
        if (parsed?.v !== 3 && parsed?.v !== 4 && parsed?.v !== CONSENT_VERSION) return null;
        const state = normalizeConsent({
            analytics: !!parsed.analytics,
            replay: !!parsed.replay,
            marketing: parsed.v === CONSENT_VERSION && !!parsed.marketing,
        });
        return isStaleDecline(state, parsed.at) ? null : state;
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

/** True only on an explicit yes to ad measurement. */
export function hasMarketingConsent(): boolean {
    return readConsent()?.marketing === true;
}

export function writeConsent(state: ConsentAnswer): ConsentState {
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
            marketing: next.marketing,
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
