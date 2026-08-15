import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import { INBOX_COLLECTION, type InboxSource } from "@/lib/inbox";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ source: string; id: string }> };

function resolveSource(source: string): InboxSource {
    if (source !== "feedback" && source !== "support") {
        throw new Error(`Unknown inbox source "${source}"`);
    }
    return source;
}

/**
 * Records a reply on the thread and delivers it.
 *
 * Two channels: the platform (always) and email (best effort). The reply is
 * written first and the delivery outcome recorded against it, so a mail outage
 * costs the email leg and nothing else — the text survives, the thread is
 * marked answered, and the reader still sees it when they next open Veinote.
 */
export const POST = withAdmin("inbox.reply", async (request, admin, ctx: Ctx) => {
    const { source, id } = await ctx.params;
    const collection = INBOX_COLLECTION[resolveSource(source)];
    const { message, keepOpen = false } = await request.json();

    if (!message || !String(message).trim()) {
        return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });
    }

    const ref = adminDb.collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const thread = snap.data() || {};
    if (!thread.userEmail) {
        return NextResponse.json({ error: "Thread has no email address to reply to" }, { status: 400 });
    }

    const body = String(message).trim();
    const subject = thread.subject?.startsWith("Re:") ? thread.subject : `Re: ${thread.subject || "Your message"}`;

    const now = FieldValue.serverTimestamp();

    // Record BEFORE sending. This used to send first and write the reply only if
    // the send succeeded, on the reasoning that a thread should never show a
    // response the user never received. That stopped being true once replies
    // were also delivered inside the platform: email is no longer the only
    // channel, so discarding the text on an SMTP failure threw away work that
    // would have reached the reader anyway — and left the thread sitting on
    // "new" with no trace that anyone had answered.
    const replyRef = await ref.collection("replies").add({
        body,
        authorUid: admin.uid,
        authorName: admin.name,
        authorEmail: admin.email,
        channel: "email",
        to: thread.userEmail,
        emailStatus: "pending",
        emailError: null,
        createdAt: now,
    });

    let emailStatus: "sent" | "failed" = "sent";
    let emailError: string | null = null;

    try {
        await sendMail({
            to: thread.userEmail,
            replyTo: "support@veinote.com",
            subject,
            text: `${body}\n\n—\n${admin.name}\nVeinote Support\nsupport@veinote.com`,
        });
    } catch (err: any) {
        // The reply still stands: stored, attributed, and visible to the user in
        // the platform. Only the email leg failed, and it now says so.
        emailStatus = "failed";
        emailError = err?.message || "Unknown mail error";
        console.error("[inbox] Reply saved but email failed:", emailError);
    }

    await replyRef.update({ emailStatus, emailError });

    const update: Record<string, unknown> = {
        replyCount: FieldValue.increment(1),
        lastMessageAt: now,
        updatedAt: now,
        // The reply is delivered twice: by email, and inside the platform. This
        // flag is what puts the dot on "Share feedback" until the user reads it.
        unreadByUser: true,
        lastReplyAt: now,
        lastReplyPreview: body.slice(0, 140),
    };

    // First-response time is the metric support is judged on — set once, never overwritten.
    if (!thread.firstResponseAt) update.firstResponseAt = now;

    // Answering is what "done" means for a message: the person wrote in, someone
    // wrote back. Replying therefore resolves the thread unless the reply is
    // explicitly a request for more information, in which case it stays open and
    // waits for them. Previously every reply left the thread open, so the queue
    // never cleared and nothing recorded who had actually dealt with it.
    if (keepOpen) {
        update.status = "pending";
    } else {
        update.status = "resolved";
        if (!thread.resolvedAt) update.resolvedAt = now;
        // Stamped every time, so a reopened-and-answered thread credits whoever
        // handled it last rather than whoever happened to touch it first.
        update.resolvedByUid = admin.uid;
        update.resolvedByName = admin.name;
        update.resolvedBy = admin.email;
    }

    // Whoever answers owns it. Reassigned on every reply, not just the first —
    // if someone else picks a thread up, the list should say so.
    update.assigneeUid = admin.uid;
    update.assigneeName = admin.name;

    await ref.update(update);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `inbox.${source}.reply`,
        targetType: "inbox_thread",
        targetId: id,
        targetLabel: thread.subject || id,
        after: { to: thread.userEmail, resolved: !keepOpen, handledBy: admin.name, emailStatus },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, emailStatus, emailError });
});
