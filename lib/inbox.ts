import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * Shared shape for everything that lands in the admin Inbox. Feedback and support
 * tickets stay in separate collections (they have different rules and retention),
 * but they carry identical fields so the console can merge them into one queue.
 *
 * These docs are written here with the Admin SDK only. Both collections deny all
 * client writes — the previous client-side writes were being silently rejected by
 * Firestore rules, so nothing was ever persisted.
 */
export type InboxSource = "feedback" | "support";
export type InboxStatus = "new" | "open" | "pending" | "resolved" | "closed";
export type InboxPriority = "low" | "normal" | "high" | "urgent";

export const INBOX_COLLECTION: Record<InboxSource, string> = {
    feedback: "user_feedback",
    support: "support_tickets",
};

export interface CreateInboxThreadInput {
    source: InboxSource;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    message: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    locale?: string | null;
    userAgent?: string | null;
    /** True when the caller's Firebase ID token was verified against userId. */
    verified: boolean;
    /** The uid the request asked to be filed under. Only meaningful when
     *  `verified` is false — it is a claim, not an identity, and must never be
     *  used for access control. Kept so support can see what was asserted. */
    claimedUid?: string | null;
}

/**
 * Confirms the claimed uid actually belongs to the caller. The modals send their
 * ID token; if it verifies we trust the identity, otherwise the thread is stored
 * as unverified so support knows not to act on it without checking.
 */
export async function verifyClaimedUser(
    request: Request,
    claimedUid: string,
): Promise<{ uid: string; claimedUid: string; email: string | null; verified: boolean }> {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    // SECURITY: an unverified caller is never given the uid they asked for.
    //
    // This used to fall back to `uid: claimedUid`, so an anonymous POST carrying
    // someone else's uid produced an inbox thread stored under that uid. Two
    // things followed: the thread showed up in the victim's account (the
    // Firestore rule keys on `userId == request.auth.uid`, as do the admin
    // replies beneath it), and support saw a request that appeared to come from
    // a real account. `verified: false` was recorded but nothing acted on it.
    //
    // The claim is kept — it is useful context on a genuine anonymous report —
    // but only as an unprivileged field that grants no access.
    const anonymous = { uid: "anonymous", claimedUid, email: null, verified: false };
    if (!token) return anonymous;

    try {
        const decoded = await adminAuth.verifyIdToken(token);
        return { uid: decoded.uid, claimedUid, email: decoded.email || null, verified: true };
    } catch {
        return anonymous;
    }
}

export async function createInboxThread(input: CreateInboxThreadInput): Promise<string> {
    const now = FieldValue.serverTimestamp();

    const doc = {
        source: input.source,
        userId: input.userId || "anonymous",
        userName: input.userName || "Anonymous User",
        userEmail: input.userEmail,
        verified: input.verified,
        // Null on a verified thread — there is nothing to disambiguate there.
        claimedUid: input.verified ? null : input.claimedUid || null,
        subject: input.subject.trim(),
        message: input.message.trim(),
        attachmentUrl: input.attachmentUrl || null,
        attachmentName: input.attachmentUrl ? input.attachmentName || "Attached file" : null,
        locale: input.locale || null,
        userAgent: input.userAgent || null,

        // Workflow fields the Inbox drives.
        status: "new" as InboxStatus,
        priority: "normal" as InboxPriority,
        category: null as string | null,
        tags: [] as string[],
        assigneeUid: null as string | null,
        assigneeName: null as string | null,
        replyCount: 0,
        firstResponseAt: null,
        resolvedAt: null,
        resolvedBy: null,

        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
    };

    const ref = await adminDb.collection(INBOX_COLLECTION[input.source]).add(doc);
    return ref.id;
}
