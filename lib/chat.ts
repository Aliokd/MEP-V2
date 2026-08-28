"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    addDoc,
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    deriveConversationKey,
    getOrCreateIdentity,
    isCryptoAvailable,
    open as openSealed,
    seal,
} from '@/lib/e2ee';
import { fetchPublicProfiles, writePublicProfile } from '@/lib/publicProfile';

export const CONVERSATIONS = 'conversations';
export const MESSAGES = 'messages';

/** How many messages a thread loads. Older ones stay in Firestore, unread. */
const HISTORY_LIMIT = 200;

/**
 * Both people must compute the same id from the pair alone, so it is the two
 * uids sorted and joined — not "mine first", which would give two conversations.
 */
export function conversationId(a: string, b: string): string {
    return [a, b].sort().join('__');
}

export interface ChatMessage {
    id: string;
    senderUid: string;
    /** Decrypted body, or null when this browser holds no key that opens it. */
    text: string | null;
    createdAt: number;
    pending?: boolean;
}

/**
 * Publishes this browser's public key if the profile doesn't already carry it.
 *
 * Called on entering a thread rather than at signup: a key is only worth
 * generating for someone who actually opens a conversation, and this is also the
 * repair path for an account whose key was lost with its site data.
 */
export async function ensurePublishedKey(uid: string): Promise<CryptoKey> {
    const identity = await getOrCreateIdentity(uid);

    const profiles = await fetchPublicProfiles([uid]);
    if (profiles[uid]?.publicKey !== identity.publicKeyRaw) {
        await writePublicProfile(uid, { publicKey: identity.publicKeyRaw });
    }

    return identity.privateKey;
}

export type ChatReadyState =
    | 'loading'
    | 'ready'
    | 'unsupported'      // no WebCrypto / IndexedDB in this browser
    | 'awaiting-peer-key'; // they have not opened a conversation on any device yet

interface UseConversationResult {
    messages: ChatMessage[];
    state: ChatReadyState;
    send: (text: string) => Promise<void>;
    sending: boolean;
}

/**
 * One end-to-end encrypted thread.
 *
 * The conversation key is derived once, held in a ref, and never written
 * anywhere. Firestore only ever sees the sealed body and its IV — see
 * lib/e2ee.ts for what that does and does not protect.
 */
export function useConversation(myUid: string | null, theirUid: string | null): UseConversationResult {
    const convId = myUid && theirUid ? conversationId(myUid, theirUid) : null;

    const keyRef = useRef<CryptoKey | null>(null);
    const [state, setState] = useState<ChatReadyState>('loading');
    const [sealedRows, setSealedRows] = useState<Array<{ id: string; senderUid: string; ciphertext: string; iv: string; createdAt: number }>>([]);
    const [decrypted, setDecrypted] = useState<ChatMessage[]>([]);
    const [pending, setPending] = useState<ChatMessage[]>([]);
    const [sending, setSending] = useState(false);

    // Establish the shared key.
    useEffect(() => {
        if (!myUid || !theirUid || !convId) return;
        if (!isCryptoAvailable()) { setState('unsupported'); return; }

        let cancelled = false;
        (async () => {
            try {
                const privateKey = await ensurePublishedKey(myUid);
                const profiles = await fetchPublicProfiles([theirUid]);
                const theirKey = profiles[theirUid]?.publicKey;

                if (!theirKey) {
                    // Nothing to derive against yet. Their first visit to a
                    // thread publishes one and this recovers on the next mount.
                    if (!cancelled) setState('awaiting-peer-key');
                    return;
                }

                const key = await deriveConversationKey(privateKey, theirKey, convId);
                if (cancelled) return;
                keyRef.current = key;
                setState('ready');
            } catch (error) {
                console.error('[chat] Could not establish conversation key:', error);
                if (!cancelled) setState('unsupported');
            }
        })();

        return () => { cancelled = true; };
    }, [myUid, theirUid, convId]);

    // Stream the sealed messages.
    useEffect(() => {
        if (!convId) return;

        const unsubscribe = onSnapshot(
            query(
                collection(db, CONVERSATIONS, convId, MESSAGES),
                orderBy('createdAt', 'asc'),
                limit(HISTORY_LIMIT),
            ),
            (snap) => {
                const rows: Array<{ id: string; senderUid: string; ciphertext: string; iv: string; createdAt: number }> = [];
                snap.forEach((d) => {
                    const data = d.data();
                    rows.push({
                        id: d.id,
                        senderUid: data.senderUid,
                        ciphertext: data.ciphertext ?? '',
                        iv: data.iv ?? '',
                        // serverTimestamp is null on the local echo of our own
                        // write until the server acknowledges it.
                        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
                    });
                });
                setSealedRows(rows);
            },
            (error) => console.error('[chat] Message listener failed:', error),
        );

        return unsubscribe;
    }, [convId]);

    // Decrypt whatever has arrived, whenever the key or the rows change.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const key = keyRef.current;
            if (!key) { setDecrypted([]); return; }

            const opened = await Promise.all(sealedRows.map(async (row) => ({
                id: row.id,
                senderUid: row.senderUid,
                createdAt: row.createdAt,
                text: await openSealed(key, { ciphertext: row.ciphertext, iv: row.iv }),
            })));

            if (!cancelled) setDecrypted(opened);
        })();
        return () => { cancelled = true; };
    }, [sealedRows, state]);

    // Drop optimistic rows once the real one lands.
    useEffect(() => {
        if (pending.length === 0) return;
        const landed = new Set(decrypted.map((m) => m.text));
        setPending((prev) => prev.filter((m) => !landed.has(m.text)));
    }, [decrypted]); // eslint-disable-line react-hooks/exhaustive-deps

    const send = async (text: string) => {
        const body = text.trim();
        const key = keyRef.current;
        if (!body || !key || !convId || !myUid || !theirUid) return;

        // Shown immediately. A sealed message has no readable form to fall back
        // on, so without this the input would clear into an empty thread.
        const optimistic: ChatMessage = {
            id: `pending-${Date.now()}`,
            senderUid: myUid,
            text: body,
            createdAt: Date.now(),
            pending: true,
        };
        setPending((prev) => [...prev, optimistic]);
        setSending(true);

        try {
            // Created on first message rather than on connecting: an empty
            // conversation document for every pair nobody ever wrote in is
            // noise. merge so a re-send never clobbers `createdAt`.
            await setDoc(
                doc(db, CONVERSATIONS, convId),
                { participants: [myUid, theirUid].sort(), lastMessageAt: serverTimestamp() },
                { merge: true },
            );

            const sealed = await seal(key, body);
            await addDoc(collection(db, CONVERSATIONS, convId, MESSAGES), {
                senderUid: myUid,
                ciphertext: sealed.ciphertext,
                iv: sealed.iv,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('[chat] Could not send message:', error);
            setPending((prev) => prev.filter((m) => m.id !== optimistic.id));
        } finally {
            setSending(false);
        }
    };

    const messages = useMemo(
        () => [...decrypted, ...pending].sort((a, b) => a.createdAt - b.createdAt),
        [decrypted, pending],
    );

    return { messages, state, send, sending };
}
