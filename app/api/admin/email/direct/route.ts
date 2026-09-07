import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import { MAX_DIRECT_RECIPIENTS, renderDirectEmail, type DirectRecipient } from "@/lib/email/directMail";

export const dynamic = "force-dynamic";

/** The last direct emails sent, newest first, for the history under the composer. */
export const GET = withAdmin("announcements.read", async () => {
    const snap = await adminDb.collection("direct_emails").orderBy("sentAt", "desc").limit(100).get();
    return NextResponse.json({
        emails: snap.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                subject: d.subject,
                body: d.body,
                recipients: d.recipients || [],
                sentCount: d.sentCount ?? 0,
                failedCount: d.failedCount ?? 0,
                sentByEmail: d.sentByEmail,
                sentAt: d.sentAt?.toMillis?.() ?? null,
            };
        }),
    });
});

/**
 * Sends one hand-written email to a chosen set of accounts.
 *
 * Recipients are named by uid and resolved here from their user documents, so
 * the address an email goes to is always the one on the account — the request
 * cannot name an arbitrary address, which is what would make this an open
 * relay for Veinote-branded mail. Capped well below campaign scale: past a
 * few dozen people this is a campaign, and campaigns have an audience model,
 * an unsubscribe footer and a scheduler for a reason.
 */
export const POST = withAdmin("announcements.send", async (request, admin) => {
    const body = await request.json().catch(() => ({}));
    const uids: string[] = Array.isArray(body.recipients)
        ? [...new Set<string>(body.recipients.filter((u: unknown): u is string => typeof u === "string" && u.length > 0))]
        : [];
    const subject = String(body.subject || "").trim();
    const markdown = String(body.body || "").trim();

    if (uids.length === 0) return NextResponse.json({ error: "Choose at least one recipient" }, { status: 400 });
    if (uids.length > MAX_DIRECT_RECIPIENTS) {
        return NextResponse.json(
            { error: `Direct email is for up to ${MAX_DIRECT_RECIPIENTS} people. For more, send a campaign.` },
            { status: 400 },
        );
    }
    if (!subject) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
    if (!markdown) return NextResponse.json({ error: "The email has no body" }, { status: 400 });

    // Resolve every recipient before sending anything, so a bad uid is reported
    // up front rather than discovered halfway through a batch.
    const recipients: DirectRecipient[] = [];
    const unresolved: string[] = [];
    for (const uid of uids) {
        const snap = await adminDb.collection("users").doc(uid).get();
        const d = snap.data();
        if (!snap.exists || !d?.email) {
            unresolved.push(uid);
            continue;
        }
        recipients.push({ uid, name: d.name || d.displayName || "", email: d.email });
    }
    if (recipients.length === 0) {
        return NextResponse.json({ error: "None of the chosen accounts has an email address" }, { status: 400 });
    }

    const results: { uid: string; email: string; ok: boolean; error?: string }[] = [];
    for (const recipient of recipients) {
        const rendered = renderDirectEmail({ subject, body: markdown }, recipient);
        try {
            await sendMail({ to: recipient.email, subject: rendered.subject, html: rendered.html, text: rendered.text });
            results.push({ uid: recipient.uid, email: recipient.email, ok: true });
        } catch (err: any) {
            // One address bouncing must not stop the rest. Recorded per person,
            // so the admin sees exactly who did not get it.
            results.push({ uid: recipient.uid, email: recipient.email, ok: false, error: err?.message || "send failed" });
        }
    }

    const sentCount = results.filter((r) => r.ok).length;
    const failedCount = results.length - sentCount;

    const ref = await adminDb.collection("direct_emails").add({
        subject,
        body: markdown,
        recipients: results.map((r) => ({ uid: r.uid, email: r.email, ok: r.ok, error: r.error ?? null })),
        unresolved,
        sentCount,
        failedCount,
        sentByUid: admin.uid,
        sentByEmail: admin.email,
        sentAt: FieldValue.serverTimestamp(),
    });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.direct.send",
        targetType: "direct_email",
        targetId: ref.id,
        targetLabel: subject,
        after: { recipients: results.length, sent: sentCount, failed: failedCount },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, id: ref.id, results, unresolved, sentCount, failedCount });
});
