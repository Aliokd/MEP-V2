"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const VERIFICATION_REQUESTS = 'verification_requests';

export type VerificationStatus = 'pending' | 'approved' | 'declined';

export interface VerificationRequest {
    uid: string;
    name: string;
    bio: string;
    photoURL: string;
    status: VerificationStatus;
    submittedAt: number;
    reviewedAt: number | null;
    /** Admin's note back to the songwriter, mainly on a decline. */
    note: string | null;
}

/** What the biography has to be before it's worth an admin's time. Mirrored in the rules. */
export const BIO_MIN = 40;
export const BIO_MAX = 600;

function toRequest(data: Record<string, any>): VerificationRequest {
    return {
        uid: data.uid,
        name: data.name ?? '',
        bio: data.bio ?? '',
        photoURL: data.photoURL ?? '',
        status: data.status === 'approved' || data.status === 'declined' ? data.status : 'pending',
        submittedAt: typeof data.submittedAt === 'number' ? data.submittedAt : 0,
        reviewedAt: typeof data.reviewedAt === 'number' ? data.reviewedAt : null,
        note: typeof data.note === 'string' && data.note ? data.note : null,
    };
}

/**
 * Whether this account carries the seal, live.
 *
 * `publicProfiles.verified` is the field that actually *is* verification — it is
 * what every other surface shows, and the only place the Admin SDK writes the
 * decision. An account can hold it without ever having filed a request here
 * (scripts/verify-user.mjs sets it directly), so the profile must read this
 * rather than infer it from a request document that may not exist.
 */
export function useIsVerified(uid: string | null): boolean {
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        if (!uid) { setVerified(false); return; }
        const unsubscribe = onSnapshot(
            doc(db, 'publicProfiles', uid),
            (snap) => setVerified(snap.exists() && snap.data()?.verified === true),
            (err) => {
                console.error('[verification] Public profile listener failed:', err);
                setVerified(false);
            },
        );
        return unsubscribe;
    }, [uid]);

    return verified;
}

/** This user's own request, live — so an approval shows the moment it lands. */
export function useVerificationRequest(uid: string | null): { request: VerificationRequest | null; loading: boolean } {
    const [request, setRequest] = useState<VerificationRequest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) { setRequest(null); setLoading(false); return; }
        const unsubscribe = onSnapshot(
            doc(db, VERIFICATION_REQUESTS, uid),
            (snap) => {
                setRequest(snap.exists() ? toRequest(snap.data()) : null);
                setLoading(false);
            },
            (err) => {
                console.error('[verification] Listener failed:', err);
                setRequest(null);
                setLoading(false);
            },
        );
        return unsubscribe;
    }, [uid]);

    return { request, loading };
}

/**
 * Files, or re-files, a request. One document per account, keyed by uid, so
 * there is never a queue of duplicates for the same person — and re-submitting
 * after a decline simply reopens it as pending.
 *
 * Only the owner's fields are written here. `status` goes in as "pending" and
 * the rules refuse any other value from the client; the decision itself is the
 * admin console's, through the Admin SDK.
 */
export async function submitVerificationRequest(input: {
    uid: string;
    name: string;
    bio: string;
    photoURL: string;
}): Promise<void> {
    const bio = input.bio.trim();
    if (bio.length < BIO_MIN || bio.length > BIO_MAX) {
        throw new Error(`Biography must be ${BIO_MIN}–${BIO_MAX} characters.`);
    }
    if (!input.photoURL) {
        throw new Error('A profile photo is required.');
    }
    await setDoc(doc(db, VERIFICATION_REQUESTS, input.uid), {
        uid: input.uid,
        name: input.name,
        bio,
        photoURL: input.photoURL,
        status: 'pending',
        submittedAt: Date.now(),
    });
}
