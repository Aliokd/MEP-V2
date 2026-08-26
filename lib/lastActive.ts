"use client";

import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/storage";
import { writePublicProfile } from "@/lib/publicProfile";

/**
 * Keeps `users/{uid}.lastActiveAt` current.
 *
 * The field was written once, at signup, and never again — so the console's
 * "Last active" column showed the join date forever, "Active today" counted
 * people who had *signed up* today, the dormant-account filter matched nobody,
 * and retention cohorts were structurally zero. Everything downstream of it was
 * wrong in the same direction.
 *
 * Throttled rather than written on every mount: this fires on each entry into
 * the platform shell, and a Firestore write per navigation would be a write per
 * click for no extra information. Ten minutes is far finer than any question the
 * admin asks of this field ("today", "this week", "dormant for 30 days").
 *
 * The stamp is uid-scoped so signing into a second account on the same browser
 * doesn't inherit the first one's throttle window.
 */
const THROTTLE_MS = 10 * 60 * 1000;

/**
 * Minutes credited each time the throttle window turns over.
 *
 * This is a *proxy* for engaged time, not a measurement of it. Reaching this
 * function means the user entered the platform shell and it has been at least
 * THROTTLE_MS since the last credit, so one window of presence is counted once.
 * Someone who opens a tab and walks away is not credited for the walk; someone
 * writing continuously for an hour collects six windows.
 *
 * CAVEAT — this figure is client-written, and Firestore rules let an account
 * write its own `users/{uid}` and `publicProfiles/{uid}`. Anyone willing to open
 * a console can inflate it. That is a deliberate trade for a decorative badge:
 * making it trustworthy means a server endpoint that stamps the increment
 * itself. Do not build anything that grants access or money on this number.
 */
const CREDIT_MINUTES = THROTTLE_MS / 60_000;

function stampKey(uid: string): string {
    return `veinote-last-active-write-${uid}`;
}

export async function touchLastActive(uid: string): Promise<void> {
    if (!uid) return;

    const previous = Number(safeLocalStorageGetItem(stampKey(uid)) || 0);
    if (Number.isFinite(previous) && Date.now() - previous < THROTTLE_MS) return;

    // Only credit a window to someone who was already here — a first-ever write
    // has no preceding window to account for, and would hand every new account
    // ten free minutes.
    const creditsWindow = Number.isFinite(previous) && previous > 0;

    // Written before the request, not after: a failed write must not retry on
    // every render. The next window picks it up.
    safeLocalStorageSetItem(stampKey(uid), String(Date.now()));

    try {
        // updateDoc, not setDoc — an account with no profile document is a
        // problem to fix at signup, not something to paper over by creating a
        // half-made user doc from here.
        const stamp = new Date().toISOString();
        await updateDoc(doc(db, "users", uid), {
            lastActiveAt: stamp,
            // increment() rather than read-modify-write: two tabs turning the
            // window over at once would otherwise each write the same total.
            ...(creditsWindow ? { activeMinutes: increment(CREDIT_MINUTES) } : {}),
        });
        // Mirrored too: the Connect roster sorts on lastActiveAt and the badge
        // reads activeMinutes, and both read the public profile rather than
        // users/{uid}.
        await writePublicProfile(uid, {
            lastActiveAt: stamp,
            ...(creditsWindow ? { activeMinutes: increment(CREDIT_MINUTES) } : {}),
        });
    } catch {
        // Offline, or no profile doc yet. Neither is worth surfacing: this is
        // bookkeeping, not something the songwriter asked for.
    }
}
