"use client";

import { useEffect, useState } from 'react';
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    query,
    updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

/** A real platform user, reduced to the fields Connect and the profile display. */
export interface PlatformUser {
    uid: string;
    name: string;
    /** Onboarding answer id — resolves to onboarding.questions.songwriter_type.options.<id>.title */
    songwriterType: string | null;
    /** Epoch ms, 0 when unknown. */
    createdAt: number;
    lastActiveAt: number;
}

// The roster is a browse list, not a directory — a bounded page keeps one big
// read off a page that already loads the whole feed.
const ROSTER_LIMIT = 60;

function parseTime(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

function toPlatformUser(uid: string, data: Record<string, any>): PlatformUser {
    return {
        uid,
        name: (data.name || '').trim(),
        songwriterType: data.answers?.songwriter_type ?? null,
        createdAt: parseTime(data.createdAt),
        lastActiveAt: parseTime(data.lastActiveAt),
    };
}

/**
 * Everyone else on the platform, most recently active first.
 *
 * Deliberately unordered at the query level: `orderBy` drops documents that lack
 * the field entirely, which would silently hide every account created before
 * `lastActiveAt` was written. Sorting client-side keeps those users visible.
 */
export async function fetchPlatformUsers(excludeUid: string | null): Promise<PlatformUser[]> {
    const snap = await getDocs(query(collection(db, 'users'), limit(ROSTER_LIMIT)));

    const users: PlatformUser[] = [];
    snap.forEach((docSnap) => {
        if (docSnap.id === excludeUid) return;
        const u = toPlatformUser(docSnap.id, docSnap.data());
        // An account that never finished signup has nothing to show on a card.
        if (!u.name) return;
        users.push(u);
    });

    users.sort((a, b) => b.lastActiveAt - a.lastActiveAt || b.createdAt - a.createdAt);
    return users;
}

/**
 * Reads specific users by uid — used by the profile to expand a connection list.
 *
 * Fetched by document id rather than filtered out of the browse roster: that
 * roster is capped, so anyone past the cap would silently disappear from a
 * user's own friend list.
 */
export async function fetchUsersByUid(uids: string[]): Promise<PlatformUser[]> {
    if (uids.length === 0) return [];

    const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, 'users', uid))));

    // Preserves the order the user connected in, and drops any uid whose account
    // no longer exists.
    return snaps
        .filter((snap) => snap.exists())
        .map((snap) => toPlatformUser(snap.id, snap.data() as Record<string, any>));
}

/**
 * Adds or removes a connection on the acting user's own profile.
 *
 * One-directional by design — "connect" here is following someone, not a mutual
 * friendship needing their acceptance. Stored on the actor's own doc, which is
 * the only user document Firestore rules let them write.
 */
export async function setConnection(uid: string, targetUid: string, connected: boolean): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
        connections: connected ? arrayUnion(targetUid) : arrayRemove(targetUid),
    });
}

/** Live list of uids the signed-in user has connected with. */
export function useConnections(): { connections: string[]; loading: boolean } {
    const { user, loading: authLoading } = useAuth();
    const [connections, setConnections] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setConnections([]);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
                setConnections((snap.data()?.connections ?? []) as string[]);
                setLoading(false);
            },
            (err) => {
                console.error('[useConnections] Failed to read connections:', err);
                setConnections([]);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [user, authLoading]);

    return { connections, loading };
}
