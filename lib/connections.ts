"use client";

import { useEffect, useMemo, useState } from 'react';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
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

export const CONNECTION_REQUESTS = 'connection_requests';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface ConnectionRequest {
    id: string;
    fromUid: string;
    toUid: string;
    status: ConnectionStatus;
    createdAt: number;
    respondedAt: number | null;
}

/** How the signed-in user stands with one other person. */
export type Relationship =
    | 'none'        // no document between them
    | 'outgoing'    // we asked, they haven't answered
    | 'incoming'    // they asked, we haven't answered
    | 'connected'   // accepted, in either direction
    | 'declined';   // we asked, they said no

// The roster is a browse list, not a directory — a bounded page keeps one big
// read off a page that already loads the whole feed.
const ROSTER_LIMIT = 60;

/** Deterministic id, so asking twice writes the same document instead of piling up. */
export function requestId(fromUid: string, toUid: string): string {
    return `${fromUid}__${toUid}`;
}

function toRequest(id: string, data: Record<string, any>): ConnectionRequest {
    return {
        id,
        fromUid: data.fromUid,
        toUid: data.toUid,
        status: (data.status ?? 'pending') as ConnectionStatus,
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
        respondedAt: typeof data.respondedAt === 'number' ? data.respondedAt : null,
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
 * user's own connection list.
 */
export async function fetchUsersByUid(uids: string[]): Promise<PlatformUser[]> {
    if (uids.length === 0) return [];

    const profiles = await fetchPublicProfiles(uids);

    // Preserves the order given, and drops any uid with no public profile — a
    // deleted account, or one the backfill has not reached.
    return uids.map((uid) => profiles[uid]).filter((profile): profile is PlatformUser => Boolean(profile));
}

/** Files a pending request. Asking again after a decline re-opens the same document. */
export async function sendConnectionRequest(fromUid: string, toUid: string): Promise<void> {
    if (fromUid === toUid) return;
    await setDoc(doc(db, CONNECTION_REQUESTS, requestId(fromUid, toUid)), {
        fromUid,
        toUid,
        status: 'pending',
        createdAt: Date.now(),
        respondedAt: null,
    });
}

/** The recipient's answer. Only they can call this — see the rules. */
export async function respondToConnectionRequest(
    id: string,
    status: Extract<ConnectionStatus, 'accepted' | 'declined'>,
): Promise<void> {
    await updateDoc(doc(db, CONNECTION_REQUESTS, id), { status, respondedAt: Date.now() });
}

/** Withdraws an unanswered request, or ends an accepted connection. Either side may. */
export async function removeConnectionRequest(id: string): Promise<void> {
    await deleteDoc(doc(db, CONNECTION_REQUESTS, id));
}

export interface ConnectionState {
    /** Uids of people this user is mutually connected with. */
    connections: string[];
    /** Requests waiting on this user's answer, newest first. */
    incoming: ConnectionRequest[];
    /** Requests this user has sent that are still unanswered. */
    outgoing: ConnectionRequest[];
    /** Every request touching this user, by the other person's uid. */
    byUid: Record<string, ConnectionRequest>;
    relationshipWith: (uid: string) => Relationship;
    loading: boolean;
}

/**
 * Live view of every connection request this user is party to.
 *
 * Two listeners rather than one: Firestore has no OR across fields, and a query
 * has to match the read rule for *every* document it returns — so "mine" is
 * `fromUid == me` and `toUid == me` read separately and merged here.
 */
export function useConnectionState(): ConnectionState {
    const { user, loading: authLoading } = useAuth();
    const [sent, setSent] = useState<ConnectionRequest[] | null>(null);
    const [received, setReceived] = useState<ConnectionRequest[] | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setSent([]);
            setReceived([]);
            return;
        }

        // Status is filtered in memory rather than in the query: adding it as a
        // second `where` makes this a composite index that would have to be
        // deployed before the feature works at all.
        let active = true;
        const listen = (
            field: 'fromUid' | 'toUid',
            apply: (rows: ConnectionRequest[]) => void,
        ) => onSnapshot(
            query(collection(db, CONNECTION_REQUESTS), where(field, '==', user.uid)),
            (snap) => {
                if (!active) return;
                const rows: ConnectionRequest[] = [];
                snap.forEach((d) => rows.push(toRequest(d.id, d.data())));
                apply(rows);
            },
            (err) => {
                if (!active) return;
                console.error(`[useConnectionState] ${field} listener failed:`, err);
                apply([]);
            },
        );

        const unsubSent = listen('fromUid', setSent);
        const unsubReceived = listen('toUid', setReceived);
        return () => {
            active = false;
            // Unsubscribe on the next tick, not synchronously. React StrictMode and
            // Fast Refresh tear an effect down and set it straight back up in the
            // same tick; unsubscribing synchronously turns that into removeTarget +
            // addTarget for the same Firestore target on an open watch stream. If
            // the server rejects the first listen (permission-denied) while that
            // pair is in flight, the SDK drops the target's bookkeeping and the late
            // ack trips "INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)",
            // after which the whole Firestore client is dead for the page
            // (firebase-js-sdk#9267). Deferred, the re-listen joins the listener
            // that is still open and nothing goes over the wire at all.
            setTimeout(() => { unsubSent(); unsubReceived(); }, 0);
        };
    }, [user, authLoading]);

    return useMemo(() => {
        const loading = authLoading || sent === null || received === null;
        const allSent = sent ?? [];
        const allReceived = received ?? [];

        // Two documents can exist between the same pair — one per direction —
        // so picking which one represents the relationship needs an order, not
        // "whichever was merged last". Higher wins.
        const rank = (row: ConnectionRequest): number => {
            if (row.status === 'accepted') return 4;              // settled, both ways
            if (row.status === 'pending') {
                return row.toUid === user?.uid ? 3 : 2;           // theirs to answer > ours to wait on
            }
            // A decline of our request still matters to us; one we issued on
            // their request is spent, and must not block us asking them.
            return row.fromUid === user?.uid ? 1 : 0;
        };

        const byUid: Record<string, ConnectionRequest> = {};
        const consider = (row: ConnectionRequest, otherUid: string) => {
            const held = byUid[otherUid];
            if (!held || rank(row) > rank(held)) byUid[otherUid] = row;
        };
        allSent.forEach((r) => consider(r, r.toUid));
        allReceived.forEach((r) => consider(r, r.fromUid));

        const connections = [
            ...allSent.filter((r) => r.status === 'accepted').map((r) => r.toUid),
            ...allReceived.filter((r) => r.status === 'accepted').map((r) => r.fromUid),
        ];

        const incoming = allReceived
            .filter((r) => r.status === 'pending')
            .sort((a, b) => b.createdAt - a.createdAt);
        const outgoing = allSent.filter((r) => r.status === 'pending');

        const relationshipWith = (uid: string): Relationship => {
            const row = byUid[uid];
            if (!row) return 'none';
            if (row.status === 'accepted') return 'connected';
            if (row.status === 'declined') {
                // Ours, refused — we may raise it again. Theirs, which we
                // refused, leaves us free to ask in our own right, so it reads
                // as no relationship at all.
                return row.fromUid === user?.uid ? 'declined' : 'none';
            }
            return row.fromUid === uid ? 'incoming' : 'outgoing';
        };

        return {
            connections: Array.from(new Set(connections)),
            incoming,
            outgoing,
            byUid,
            relationshipWith,
            loading,
        };
    }, [sent, received, authLoading, user?.uid]);
}

/**
 * Just the accepted connections.
 *
 * Kept as its own hook because the profile list and the collaborator invite
 * field only ever wanted "people I'm connected with" — both now get the
 * consented set without knowing anything about requests.
 */
export function useConnections(): { connections: string[]; loading: boolean } {
    const { connections, loading } = useConnectionState();
    return { connections, loading };
}
