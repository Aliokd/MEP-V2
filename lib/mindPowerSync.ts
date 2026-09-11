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

/**
 * Once per uid per session. Resolves either way; offline just means device-local marks for now.
 *
 * Pulls the account's marks into this device, and — the other direction — sends
 * up any mark this device holds that the account does not. Marks made before
 * they were carried on the account (a golden week dismissed on the laptop last
 * month) lived in that browser alone, and every new device replayed them; the
 * first visit from the device that holds them now heals the account.
 */
export async function pullMindPowerMarks(uid: string): Promise<void> {
    if (pulledForUid === uid) return;
    pulledForUid = uid;
    try {
        const localGolden = readGoldenMindShown();
        const localIntro = typeof window !== 'undefined' && localStorage.getItem(STREAK_INTRO_KEY) === 'true';

        const snap = await getDoc(doc(db, 'users', uid));
        const remote = snap.exists() ? (snap.data().mindPower as RemoteMarks | undefined) : undefined;
        const remoteGolden = Array.isArray(remote?.goldenShownWeeks)
            ? remote.goldenShownWeeks.filter((k): k is string => typeof k === 'string')
            : [];

        if (remoteGolden.length > 0) mergeGoldenMindShown(remoteGolden);
        // Any celebration is the introduction: an account with a celebrated week
        // behind it has met its streak, whether or not the intro flag itself made
        // it onto the account.
        if (remote?.streakIntroShown === true || remoteGolden.length > 0) {
            safeLocalStorageSetItem(STREAK_INTRO_KEY, 'true');
        }

        const remoteSet = new Set(remoteGolden);
        const accountIsBehind =
            localGolden.some(k => !remoteSet.has(k)) ||
            (localIntro && remote?.streakIntroShown !== true);
        if (accountIsBehind) pushMindPowerMarks(uid);
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
