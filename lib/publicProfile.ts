"use client";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    where,
    documentId,
    type FieldValue,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * The publicly-visible slice of a user account.
 *
 * `users/{uid}` holds an email address, a `billing` object with the Paddle
 * customer and subscription ids, the onboarding answers, and any sanction on the
 * account. Firestore has no field-level read control, so the rule that let one
 * signed-in user read another's document to show a collaborator's name handed
 * over all of that at the same time — every account's email was readable by
 * anyone who could sign up.
 *
 * This collection is the fix: the handful of fields that are genuinely public
 * are mirrored here, `users/{uid}` is readable only by its owner and admins, and
 * every cross-user read goes through this module instead.
 *
 * Writes are mirrored from the places that write the source fields — see
 * writePublicProfile's callers — and scripts/backfill-public-profiles.mjs seeds
 * the collection for accounts that existed before it did.
 */
export interface PublicProfile {
    uid: string;
    name: string;
    photoURL: string | null;
    /** Onboarding answer id — resolves to onboarding.questions.songwriter_type.options.<id>.title */
    songwriterType: string | null;
    /** Epoch ms, 0 when unknown. */
    createdAt: number;
    lastActiveAt: number;
    /** Approximate engaged minutes, accumulated by the heartbeat in lib/lastActive.ts.
     *  Self-reported and therefore forgeable — decorative use only. */
    activeMinutes: number;
    /** Base64 raw ECDH P-256 public key for direct messages, or null before this
     *  account has opened a conversation on any device. See lib/e2ee.ts. */
    publicKey: string | null;
}

/**
 * Minutes of engaged time that earn the badge on a songwriter's card.
 *
 * 30 hours: enough that it reads as "this person really uses Veinote" rather
 * than "this person signed up", and reachable inside a couple of months of
 * regular writing. Tune here — nothing else hard-codes the figure.
 */
export const ACTIVE_BADGE_MINUTES = 30 * 60;

export function hasActivityBadge(profile: Pick<PublicProfile, 'activeMinutes'>): boolean {
    return (profile.activeMinutes ?? 0) >= ACTIVE_BADGE_MINUTES;
}

export const PUBLIC_PROFILES = "publicProfiles";

/** Firestore rejects an `in` / `documentId()` query with more than 30 values. */
const IN_QUERY_LIMIT = 30;

function parseTime(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

export function toPublicProfile(uid: string, data: Record<string, any>): PublicProfile {
    return {
        uid,
        name: (data.name || "").trim(),
        photoURL: data.photoURL || null,
        songwriterType: data.songwriterType ?? null,
        createdAt: parseTime(data.createdAt),
        lastActiveAt: parseTime(data.lastActiveAt),
        activeMinutes: typeof data.activeMinutes === "number" ? data.activeMinutes : 0,
        publicKey: typeof data.publicKey === "string" && data.publicKey ? data.publicKey : null,
    };
}

export interface PublicProfileWrite {
    name?: string;
    photoURL?: string | null;
    songwriterType?: string | null;
    createdAt?: string | number;
    lastActiveAt?: string | number;
    /** Accepts a FieldValue so callers can pass increment() rather than a total. */
    activeMinutes?: number | FieldValue;
    publicKey?: string;
}

/**
 * Mirrors public fields for one account.
 *
 * Merging rather than replacing, so a caller that only knows the new photo does
 * not blank the name. Best-effort by design: the mirror is display data, and a
 * failed write here must never fail the operation that triggered it — the source
 * write to `users/{uid}` is the one that matters.
 */
export async function writePublicProfile(uid: string, fields: PublicProfileWrite): Promise<void> {
    if (!uid) return;
    const payload: Record<string, unknown> = { uid };
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) payload[key] = value;
    }

    try {
        await setDoc(doc(db, PUBLIC_PROFILES, uid), payload, { merge: true });
    } catch (err) {
        console.warn("[publicProfile] Could not mirror profile for", uid, err);
    }
}

/** Public profiles for a specific set of uids, keyed by uid. */
export async function fetchPublicProfiles(uids: string[]): Promise<Record<string, PublicProfile>> {
    const profiles: Record<string, PublicProfile> = {};
    const unique = Array.from(new Set(uids.filter(Boolean)));
    if (unique.length === 0) return profiles;

    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += IN_QUERY_LIMIT) {
        chunks.push(unique.slice(i, i + IN_QUERY_LIMIT));
    }

    for (const chunk of chunks) {
        try {
            const snap = await getDocs(
                query(collection(db, PUBLIC_PROFILES), where(documentId(), "in", chunk)),
            );
            snap.forEach((docSnap) => {
                profiles[docSnap.id] = toPublicProfile(docSnap.id, docSnap.data());
            });
        } catch (err) {
            // One malformed chunk shouldn't lose the rest — fall back to reads by id.
            console.warn("[publicProfile] Chunked read failed, falling back:", err);
            for (const uid of chunk) {
                try {
                    const snap = await getDoc(doc(db, PUBLIC_PROFILES, uid));
                    if (snap.exists()) profiles[uid] = toPublicProfile(snap.id, snap.data());
                } catch {
                    // Skip this one; a missing card is better than a broken page.
                }
            }
        }
    }

    return profiles;
}

/** A bounded browse roster for Connect. */
export async function fetchPublicProfileRoster(
    excludeUid: string | null,
    max: number,
): Promise<PublicProfile[]> {
    const snap = await getDocs(query(collection(db, PUBLIC_PROFILES), limit(max)));

    const users: PublicProfile[] = [];
    snap.forEach((docSnap) => {
        if (docSnap.id === excludeUid) return;
        const profile = toPublicProfile(docSnap.id, docSnap.data());
        // An account that never finished signup has nothing to show on a card.
        if (!profile.name) return;
        users.push(profile);
    });

    return users;
}
