"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/storage";

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

function stampKey(uid: string): string {
    return `veinote-last-active-write-${uid}`;
}

export async function touchLastActive(uid: string): Promise<void> {
    if (!uid) return;

    const previous = Number(safeLocalStorageGetItem(stampKey(uid)) || 0);
    if (Number.isFinite(previous) && Date.now() - previous < THROTTLE_MS) return;

    // Written before the request, not after: a failed write must not retry on
    // every render. The next window picks it up.
    safeLocalStorageSetItem(stampKey(uid), String(Date.now()));

    try {
        // updateDoc, not setDoc — an account with no profile document is a
        // problem to fix at signup, not something to paper over by creating a
        // half-made user doc from here.
        await updateDoc(doc(db, "users", uid), { lastActiveAt: new Date().toISOString() });
    } catch {
        // Offline, or no profile doc yet. Neither is worth surfacing: this is
        // bookkeeping, not something the songwriter asked for.
    }
}
