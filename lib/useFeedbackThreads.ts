"use client";

import { useEffect, useState } from "react";
import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

/**
 * The signed-in user's own feedback and support threads, and any replies the
 * team has sent.
 *
 * A reply is delivered twice — by email, and here. Email alone means a reply
 * lands in a spam folder and the conversation quietly dies; this is the copy
 * that can't get lost.
 */

export type ThreadSource = "feedback" | "support";

const COLLECTIONS: Record<ThreadSource, string> = {
    feedback: "user_feedback",
    support: "support_tickets",
};

export interface ThreadReply {
    id: string;
    body: string;
    authorName: string;
    createdAt: number | null;
}

export interface UserThread {
    id: string;
    source: ThreadSource;
    subject: string;
    message: string;
    status: string;
    createdAt: number | null;
    lastReplyAt: number | null;
    replyCount: number;
    unread: boolean;
}

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === "number") return value;
    return null;
}

/**
 * Live view of the user's threads across both collections.
 *
 * Two listeners rather than one: feedback and support are separate collections
 * with separate rules, and Firestore has no cross-collection query. They're
 * merged and sorted here.
 */
export function useFeedbackThreads() {
    const { user } = useAuth();
    const [threads, setThreads] = useState<UserThread[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setThreads([]);
            setLoading(false);
            return;
        }

        const bySource: Record<string, UserThread[]> = { feedback: [], support: [] };

        const unsubscribes = (Object.keys(COLLECTIONS) as ThreadSource[]).map((source) =>
            onSnapshot(
                query(collection(db, COLLECTIONS[source]), where("userId", "==", user.uid)),
                (snap) => {
                    bySource[source] = snap.docs.map((docSnap) => {
                        const d = docSnap.data();
                        return {
                            id: docSnap.id,
                            source,
                            subject: d.subject || "",
                            message: d.message || "",
                            status: d.status || "new",
                            createdAt: toMillis(d.createdAt),
                            lastReplyAt: toMillis(d.lastReplyAt),
                            replyCount: d.replyCount || 0,
                            unread: d.unreadByUser === true,
                        };
                    });

                    const merged = [...bySource.feedback, ...bySource.support].sort(
                        (a, b) =>
                            (b.lastReplyAt || b.createdAt || 0) - (a.lastReplyAt || a.createdAt || 0),
                    );
                    setThreads(merged);
                    setLoading(false);
                },
                (err) => {
                    // Most likely cause is rules not yet deployed. Staying quiet is
                    // right: this is an ambient indicator, not something the user asked for.
                    console.warn(`[feedback] Could not read ${source} threads:`, err.message);
                    setLoading(false);
                },
            ),
        );

        return () => unsubscribes.forEach((fn) => fn());
    }, [user]);

    return { threads, loading, unreadCount: threads.filter((t) => t.unread).length };
}

/** Replies on one thread, oldest first. */
export async function fetchThreadReplies(
    source: ThreadSource,
    threadId: string,
): Promise<ThreadReply[]> {
    const snap = await getDocs(
        query(collection(db, COLLECTIONS[source], threadId, "replies"), orderBy("createdAt", "asc")),
    );
    return snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
            id: docSnap.id,
            body: d.body || "",
            authorName: d.authorName || "Veinote",
            createdAt: toMillis(d.createdAt),
        };
    });
}

/**
 * Clears the unread flag. Firestore rules allow the thread's author to change
 * this field and nothing else, so no server round trip is needed.
 */
export async function markThreadRead(source: ThreadSource, threadId: string): Promise<void> {
    try {
        await updateDoc(doc(db, COLLECTIONS[source], threadId), {
            unreadByUser: false,
            readByUserAt: new Date().toISOString(),
        });
    } catch (err) {
        console.warn("[feedback] Could not mark thread read:", err);
    }
}
