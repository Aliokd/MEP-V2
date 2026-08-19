"use client";

import { useEffect, useState } from 'react';
import {
    arrayRemove,
    arrayUnion,
    doc,
    onSnapshot,
    updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
    fetchPublicProfileRoster,
    fetchPublicProfiles,
    type PublicProfile,
} from '@/lib/publicProfile';

/** A real platform user, reduced to the fields Connect and the profile display.
 *  Structurally the public profile — kept as its own name because Connect and the
 *  profile page are written against it. */
export type PlatformUser = PublicProfile;

// The roster is a browse list, not a directory — a bounded page keeps one big
// read off a page that already loads the whole feed.
const ROSTER_LIMIT = 60;

/**
 * Everyone else on the platform, most recently active first.
 *
 * Deliberately unordered at the query level: `orderBy` drops documents that lack
 * the field entirely, which would silently hide every account created before
 * `lastActiveAt` was written. Sorting client-side keeps those users visible.
 */
export async function fetchPlatformUsers(excludeUid: string | null): Promise<PlatformUser[]> {
    // publicProfiles, not users: the roster only ever showed a name and a
    // songwriter type, but reading it out of users/{uid} meant every account's
    // email and billing record came along with it. See lib/publicProfile.ts.
    const users = await fetchPublicProfileRoster(excludeUid, ROSTER_LIMIT);

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

    const profiles = await fetchPublicProfiles(uids);

    // Preserves the order the user connected in, and drops any uid with no
    // public profile — a deleted account, or one the backfill has not reached.
    return uids.map((uid) => profiles[uid]).filter((profile): profile is PlatformUser => Boolean(profile));
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
