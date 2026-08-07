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

/** Clear the flag so the guide plays again — used by the "Guide" option in settings. */
export async function resetGuide(uid: string): Promise<void> {
    safeLocalStorageSetItem(localKey(uid), 'false');
    try {
        await setDoc(
            doc(db, 'users', uid),
            { onboarding: { guideSeenAt: null } },
            { merge: true }
        );
    } catch (err) {
        console.error('[Guide] Failed to reset guide state:', err);
    }
}
