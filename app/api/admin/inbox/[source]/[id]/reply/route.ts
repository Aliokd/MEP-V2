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
 * Sends a reply to the person who wrote in and records it on the thread.
 *
 * The email goes out first: if the send fails the reply is not recorded, so the
 * thread never shows a response the user never received.
 */
export const POST = withAdmin("inbox.reply", async (request, admin, ctx: Ctx) => {
    const { source, id } = await ctx.params;
    const collection = INBOX_COLLECTION[resolveSource(source)];
    const { message, resolve } = await request.json();

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

    await sendMail({
        to: thread.userEmail,
        replyTo: "support@veinote.com",
        subject,
        text: `${body}\n\n—\n${admin.name}\nVeinote Support\nsupport@veinote.com`,
    });

    const now = FieldValue.serverTimestamp();

    await ref.collection("replies").add({
        body,
        authorUid: admin.uid,
        authorName: admin.name,
        authorEmail: admin.email,
        channel: "email",
        to: thread.userEmail,
        createdAt: now,
    });

    const update: Record<string, unknown> = {
        replyCount: FieldValue.increment(1),
        lastMessageAt: now,
        updatedAt: now,
    };

    // First-response time is the metric support is judged on — set once, never overwritten.
    if (!thread.firstResponseAt) update.firstResponseAt = now;

    if (resolve) {
        update.status = "resolved";
        if (!thread.resolvedAt) {
            update.resolvedAt = now;
            update.resolvedBy = admin.email;
        }
    } else if (thread.status === "new") {
        update.status = "open";
    }

    // An unassigned thread becomes the replier's once they answer it.
    if (!thread.assigneeUid) {
        update.assigneeUid = admin.uid;
        update.assigneeName = admin.name;
    }

    await ref.update(update);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `inbox.${source}.reply`,
        targetType: "inbox_thread",
        targetId: id,
        targetLabel: thread.subject || id,
        after: { to: thread.userEmail, resolved: Boolean(resolve) },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
