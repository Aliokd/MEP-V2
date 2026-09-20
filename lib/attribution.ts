/**
 * Where a visitor came from, remembered until they sign up.
 *
 * An ad lands someone on the homepage with `utm_*` tags and a click id in
 * the URL. Signup happens pages later, on /onboarding, by which time the
 * URL is clean. So the first page keeps what the URL said (first touch,
 * never overwritten by a later visit) in localStorage, and the onboarding
 * step sends it along with the email; the server stores it under
 * `signup.attribution`, and the console shows it beside the account.
 *
 * Nothing here identifies a person: campaign names, a referrer host and an
 * opaque click id. localStorage may be unavailable (private mode, blocked
 * storage); every access is guarded and a missing record is simply null.
 */

export interface Attribution {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
    utmTerm: string | null;
    clickId: string | null;
    clickIdKind: string | null;
    referrer: string | null;
    landingPath: string | null;
    capturedAt: string;
}

const KEY = 'veinote_attribution';
const CLICK_IDS = ['gclid', 'fbclid', 'ttclid', 'msclkid', 'twclid', 'li_fat_id'] as const;
const MAX = 120;

function clean(value: string | null): string | null {
    if (!value) return null;
    const v = value.trim().slice(0, MAX);
    return v || null;
}

/** The current URL's attribution, or null when it carries none. */
export function readAttributionFromLocation(): Attribution | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const utmSource = clean(params.get('utm_source'));
    const utmMedium = clean(params.get('utm_medium'));
    const utmCampaign = clean(params.get('utm_campaign'));
    const utmContent = clean(params.get('utm_content'));
    const utmTerm = clean(params.get('utm_term'));

    let clickId: string | null = null;
    let clickIdKind: string | null = null;
    for (const kind of CLICK_IDS) {
        const v = clean(params.get(kind));
        if (v) { clickId = v; clickIdKind = kind; break; }
    }

    let referrer: string | null = null;
    try {
        if (document.referrer) {
            const host = new URL(document.referrer).hostname;
            // Our own pages are not a source.
            if (host && host !== window.location.hostname) referrer = host;
        }
    } catch { /* not a URL */ }

    const hasSignal = utmSource || utmMedium || utmCampaign || clickId || referrer;
    if (!hasSignal) return null;

    return {
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        clickId,
        clickIdKind,
        referrer,
        landingPath: clean(window.location.pathname),
        capturedAt: new Date().toISOString(),
    };
}

export function getStoredAttribution(): Attribution | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as Attribution) : null;
    } catch {
        return null;
    }
}

/**
 * Records the first touch. A stored record is kept unless the new visit
 * carries a click id or a campaign and the old one had neither: a tagged
 * ad click outranks a bare referrer, but never another tagged click.
 */
export function captureAttribution(): void {
    const fresh = readAttributionFromLocation();
    if (!fresh) return;
    const stored = getStoredAttribution();
    const freshTagged = Boolean(fresh.clickId || fresh.utmCampaign || fresh.utmSource);
    const storedTagged = Boolean(stored && (stored.clickId || stored.utmCampaign || stored.utmSource));
    if (stored && (storedTagged || !freshTagged)) return;
    try {
        localStorage.setItem(KEY, JSON.stringify(fresh));
    } catch { /* storage off */ }
}

export function clearAttribution(): void {
    try { localStorage.removeItem(KEY); } catch { /* storage off */ }
}
