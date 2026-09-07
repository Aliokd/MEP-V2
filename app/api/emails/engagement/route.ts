import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { sendMail } from "@/lib/email/send";
import { getCopyOverrides } from "@/lib/siteCopy";
import { resolveLocale } from "@/lib/email/locale";
import { songCommentedEmail, songLikedEmail } from "@/lib/email/templates/engagement";
import { localizePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Most engagement emails one person receives in a day. Past this, the app is the notification. */
const DAILY_CAP = 30;

/**
 * Tells a songwriter that someone liked or commented on their post.
 *
 * The like and the comment are client writes straight to Firestore, so this
 * route runs after them, named by the person who did the liking. It trusts
 * nothing in the request beyond the ids: the recipient is whoever the post
 * says wrote it, the actor's name comes off the actor's own user document,
 * and the event has to be visible on the post (the caller in `likedBy`, or a
 * comment carrying the caller's uid) before anything is sent. A request that
 * does not match the post is answered with a quiet skip, never a send.
 *
 * Idempotent per event: one email per like, one per comment, however many
 * times the route is called. And capped per recipient per day, because a post
 * that takes off should not empty into an inbox.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const throttled = rateLimitGuard(request, "engagement", auth.uid);
    if (throttled) return throttled;

    const body = await request.json().catch(() => ({}));
    const postId = typeof body.postId === "string" ? body.postId : "";
    const kind = body.kind === "like" || body.kind === "comment" ? (body.kind as "like" | "comment") : null;
    const commentId = typeof body.commentId === "string" ? body.commentId : "";

    if (!postId || !kind || (kind === "comment" && !commentId)) {
        return NextResponse.json({ error: "Missing postId, kind or commentId" }, { status: 400 });
    }

    const postSnap = await adminDb.collection("connect_posts").doc(postId).get();
    if (!postSnap.exists) return NextResponse.json({ success: true, skipped: "post not found" });
    const post = postSnap.data() as {
        authorId?: string | null;
        projectName?: string;
        likedBy?: string[];
        comments?: { id?: string; authorUid?: string; body?: string }[];
    };

    const ownerUid = post.authorId || "";
    if (!ownerUid) return NextResponse.json({ success: true, skipped: "post has no author" });
    if (ownerUid === auth.uid) return NextResponse.json({ success: true, skipped: "own post" });

    // The event must have actually happened, as the post records it.
    let comment: string | null = null;
    if (kind === "like") {
        if (!(post.likedBy || []).includes(auth.uid)) {
            return NextResponse.json({ success: true, skipped: "no like on record" });
        }
    } else {
        const found = (post.comments || []).find((c) => c.id === commentId);
        if (!found || found.authorUid !== auth.uid || !found.body) {
            return NextResponse.json({ success: true, skipped: "no such comment by caller" });
        }
        comment = found.body;
    }

    // One email per event. `create` fails when the document exists, which is
    // the second call for the same like or comment.
    const eventId = `${postId}__${kind}__${kind === "comment" ? commentId : auth.uid}`;
    const eventRef = adminDb.collection("engagement_emails").doc(eventId);
    try {
        await eventRef.create({
            postId,
            kind,
            commentId: commentId || null,
            actorUid: auth.uid,
            recipientUid: ownerUid,
            createdAt: FieldValue.serverTimestamp(),
            status: "pending",
        });
    } catch (err: any) {
        if (err?.code === 6 || /already exists/i.test(String(err?.message))) {
            return NextResponse.json({ success: true, skipped: "already sent" });
        }
        throw err;
    }

    const [ownerSnap, actorSnap] = await Promise.all([
        adminDb.collection("users").doc(ownerUid).get(),
        adminDb.collection("users").doc(auth.uid).get(),
    ]);
    const owner = ownerSnap.data() as
        | { email?: string; name?: string; displayName?: string; locale?: string; emailOptOut?: boolean }
        | undefined;
    const actorData = actorSnap.data() as { name?: string; displayName?: string } | undefined;

    const finish = async (status: string, extra: Record<string, unknown> = {}) => {
        await eventRef.set({ status, ...extra, resolvedAt: FieldValue.serverTimestamp() }, { merge: true });
        return NextResponse.json({ success: true, skipped: status === "sent" ? undefined : status });
    };

    if (!owner?.email) return finish("recipient has no email");
    if (owner.emailOptOut === true) return finish("recipient opted out");

    // Per-recipient daily cap, counted in a transaction so parallel likes
    // cannot all squeeze under it.
    const day = new Date().toISOString().slice(0, 10);
    const quotaRef = adminDb.collection("engagement_email_quota").doc(ownerUid);
    const allowed = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(quotaRef);
        const data = snap.data() as { day?: string; count?: number } | undefined;
        const count = data?.day === day ? data.count || 0 : 0;
        if (count >= DAILY_CAP) return false;
        tx.set(quotaRef, { day, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
        return true;
    });
    if (!allowed) return finish("daily cap reached");

    const locale = resolveLocale(owner.locale);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
    const params = {
        name: (owner.name || owner.displayName || "").trim().split(/\s+/)[0] || "there",
        actor: (actorData?.name || actorData?.displayName || "A songwriter").trim(),
        song: post.projectName || "",
        postUrl: `${appUrl}${localizePath("/platform/connect", locale)}`,
    };
    const overrides = await getCopyOverrides();
    const rendered =
        kind === "like"
            ? songLikedEmail(locale, params, overrides)
            : songCommentedEmail(locale, { ...params, comment: comment || "" }, overrides);

    try {
        await sendMail({ to: owner.email, subject: rendered.subject, html: rendered.html, text: rendered.text });
    } catch (err: any) {
        console.error("[emails/engagement] send failed:", err?.message || err);
        return finish("send failed", { error: String(err?.message || err) });
    }

    return finish("sent");
}
