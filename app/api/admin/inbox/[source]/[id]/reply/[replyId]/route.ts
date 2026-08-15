import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import { INBOX_COLLECTION, type InboxSource } from "@/lib/inbox";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ source: string; id: string; replyId: string }> };

function resolveSource(source: string): InboxSource {
    if (source !== "feedback" && source !== "support") {
        throw new Error(`Unknown inbox source "${source}"`);
    }
    return source;
}

/**
 * Retries the email for a reply that was recorded but never delivered.
 *
 * Replies written while the mail server was misconfigured are kept rather than
 * discarded, so once the configuration is fixed they can be sent without anyone
 * retyping them. Nothing is duplicated on the thread — this only re-attempts the
 * email leg of a reply that already exists.
 */
export const POST = withAdmin("inbox.reply", async (request, admin, ctx: Ctx) => {
    const { source, id, replyId } = await ctx.params;
    const collection = INBOX_COLLECTION[resolveSource(source)];

    const threadRef = adminDb.collection(collection).doc(id);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    const thread = threadSnap.data() || {};

    const replyRef = threadRef.collection("replies").doc(replyId);
    const replySnap = await replyRef.get();
    if (!replySnap.exists) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    const reply = replySnap.data() || {};

    if (reply.emailStatus === "sent") {
        return NextResponse.json({ error: "That reply was already emailed" }, { status: 400 });
    }

    const to = reply.to || thread.userEmail;
    if (!to) return NextResponse.json({ error: "No address to send to" }, { status: 400 });

    const subject = thread.subject?.startsWith("Re:") ? thread.subject : `Re: ${thread.subject || "Your message"}`;

    try {
        await sendMail({
            to,
            replyTo: "support@veinote.com",
            subject,
            // Re-sent as originally written, attributed to whoever wrote it —
            // not to whoever pressed retry.
            text: `${reply.body}\n\n—\n${reply.authorName || "Veinote Support"}\nVeinote Support\nsupport@veinote.com`,
        });
    } catch (err: any) {
        const emailError = err?.message || "Unknown mail error";
        await replyRef.update({ emailStatus: "failed", emailError });
        return NextResponse.json({ error: emailError }, { status: 502 });
    }

    await replyRef.update({ emailStatus: "sent", emailError: null, resentAt: new Date().toISOString() });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `inbox.${source}.reply.resend`,
        targetType: "inbox_thread",
        targetId: id,
        targetLabel: thread.subject || id,
        after: { replyId, to },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, sentTo: to });
});
