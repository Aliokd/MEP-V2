"use client";

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { safeLocalStorageSetItem } from './storage';
import { GOLDEN_MIND_SHOWN_KEY, STREAK_INTRO_KEY, readGoldenMindShown, mergeGoldenMindShown } from './weeklyActivity';

/**
 * The marks that decide whether a celebration shows, kept on the account and
 * not only in the browser: which weeks the golden-mind popup was dismissed
 * for, and whether the streak has been introduced. Without this, every new
 * device replayed the popup, and nobody wants to be congratulated twice.
 *
 * users/{uid}.mindPower is the durable copy. The first mount per session pulls
 * it and union-merges it into the local marks before any popup decision is
 * made; every dismissal writes the full local set back. Union on purpose: a
 * mark should never silently vanish, and re-showing is the failure mode that
 * this exists to prevent.
 */

interface RemoteMarks {
    goldenShownWeeks?: unknown;
    streakIntroShown?: unknown;
}

let pulledForUid: string | null = null;

/** Once per uid per session. Resolves either way; offline just means device-local marks for now. */
export async function pullMindPowerMarks(uid: string): Promise<void> {
    if (pulledForUid === uid) return;
    pulledForUid = uid;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const remote = snap.exists() ? (snap.data().mindPower as RemoteMarks | undefined) : undefined;
        if (!remote) return;
        if (Array.isArray(remote.goldenShownWeeks)) {
            mergeGoldenMindShown(remote.goldenShownWeeks.filter((k): k is string => typeof k === 'string'));
        }
        if (remote.streakIntroShown === true) safeLocalStorageSetItem(STREAK_INTRO_KEY, 'true');
    } catch {
        // Offline or a rules hiccup: let a later mount try again.
        pulledForUid = null;
    }
}

/** Write the local marks to the account. Fire-and-forget: the next dismissal pushes the full set again. */
export function pushMindPowerMarks(uid: string): void {
    if (typeof window === 'undefined') return;
    const payload = {
        mindPower: {
            goldenShownWeeks: readGoldenMindShown(),
            streakIntroShown: localStorage.getItem(STREAK_INTRO_KEY) === 'true',
        },
    };
    setDoc(doc(db, 'users', uid), payload, { merge: true }).catch(err =>
        console.warn('[mindPower] Could not persist celebration marks:', err),
    );
}

export { GOLDEN_MIND_SHOWN_KEY };
