import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '@/lib/storage';

/**
 * The welcome guide (intro video + feature tour) is a once-in-a-lifetime thing per
 * *account*, not per browser — so the source of truth is the user's Firestore doc.
 * localStorage is only a first-paint cache so a returning user on a known device never
 * sees the tour flash in while Firestore resolves.
 *
 * The cache key is uid-suffixed rather than added to ACCOUNT_SCOPED_KEYS in lib/storage.ts —
 * either satisfies the account-isolation rule, and suffixing means a second account on the
 * same browser simply misses the cache and falls through to its own Firestore value.
 */
const LOCAL_KEY_PREFIX = 'mep-guide-seen';

const localKey = (uid: string) => `${LOCAL_KEY_PREFIX}-${uid}`;

/** Cached answer for this uid, or null when we've never recorded one on this device. */
export function readCachedGuideSeen(uid: string): boolean | null {
    const raw = safeLocalStorageGetItem(localKey(uid));
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
}

/**
 * Whether this account has already been through the guide. Falls back to the cached
 * value if Firestore is unreachable, and to "already seen" if there's no cache either —
 * a read failure should never re-run onboarding for an established user.
 */
export async function fetchGuideSeen(uid: string): Promise<boolean> {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const seen = !!snap.data()?.onboarding?.guideSeenAt;
        safeLocalStorageSetItem(localKey(uid), seen ? 'true' : 'false');
        return seen;
    } catch (err) {
        console.warn('[Guide] Could not read guide state from Firestore:', err);
        return readCachedGuideSeen(uid) ?? true;
    }
}

/** Mark the guide as completed/dismissed. Writes the cache first so the UI settles instantly. */
export async function markGuideSeen(uid: string): Promise<void> {
    safeLocalStorageSetItem(localKey(uid), 'true');
    try {
        await setDoc(
            doc(db, 'users', uid),
            { onboarding: { guideSeenAt: new Date().toISOString() } },
            { merge: true }
        );
    } catch (err) {
        console.error('[Guide] Failed to persist guide completion:', err);
    }
}

/**
 * Set for the hop between "Play demo" in settings and the guide mounting on the
 * canvas. A first-time user meets the intro video as a small player docked in the
 * corner and presses play themselves; someone who just clicked "Play demo" has
 * already expressed that intent, so the replay opens the video centered and
 * playing instead of tucked away where it reads as missing.
 *
 * sessionStorage, not state: the two live on different routes with a navigation
 * in between, and it must not survive into a later session.
 */
const REPLAY_KEY = 'veinote-guide-replay';

/** True once, for the guide launched by the most recent "Play demo" click. */
export function consumeGuideReplayIntent(): boolean {
    try {
        if (sessionStorage.getItem(REPLAY_KEY) !== 'true') return false;
        sessionStorage.removeItem(REPLAY_KEY);
        return true;
    } catch {
        return false;
    }
}

/**
 * Play the guide again now — used by the "Demo" option in settings.
 *
 * Deliberately local-only. "Replay" means *show it to me now*, not "un-see it
 * forever": clearing the device cache is enough for this component to run the
 * guide on arrival, and the account keeps its `guideSeenAt` stamp so the guide
 * still never returns unbidden at the next login.
 *
 * Writing `guideSeenAt: null` here used to race the stamp that PlatformOnboarding
 * writes when the guide appears (~2s later, after the navigation). If the null
 * landed second, the account was left un-onboarded and the guide came back on
 * every login — the exact thing this is all guarding against.
 */
export async function resetGuide(uid: string): Promise<void> {
    safeLocalStorageSetItem(localKey(uid), 'false');
    try { sessionStorage.setItem(REPLAY_KEY, 'true'); } catch { /* private mode */ }
}
