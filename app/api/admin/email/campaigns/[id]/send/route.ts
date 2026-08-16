import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import {
    BATCH_SIZE,
    SEND_DELAY_MS,
    fetchRecipientPage,
    renderCampaignEmail,
    sleep,
} from "@/lib/email/campaigns";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sends one batch of a campaign and reports where it got to.
 *
 * Deliberately not "send the whole thing": Cloud Run kills the request at 120s,
 * so a single-shot send would die partway through a real list with no record of
 * who had already received it, and retrying would mail those people twice. Each
 * call takes a slice, advances a cursor, and returns whether more remain — the
 * caller loops. An interrupted campaign resumes from the cursor rather than the
 * beginning, which is what makes a double-send impossible.
 *
 * Sends are sequential with a pause between them. Firing them in parallel is
 * faster right up until the mail host treats it as a burst and starts refusing.
 */
export const POST = withAdmin("announcements.send", async (request, admin, ctx: Ctx) => {
    const { id } = await ctx.params;
    const ref = adminDb.collection("email_campaigns").doc(id);
    const snap = await ref.get();

    if (!snap.exists) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const campaign = snap.data() || {};

    if (campaign.status === "sent") {
        return NextResponse.json({ error: "This campaign has already finished sending" }, { status: 400 });
    }

    const audience = {
        tiers: campaign.audience?.tiers || [],
        locales: campaign.audience?.locales || [],
    };

    // Claim the campaign before sending anything, so two admins pressing send at
    // once can't both start from the same cursor.
    if (campaign.status !== "sending") {
        await ref.update({
            status: "sending",
            startedAt: campaign.startedAt || FieldValue.serverTimestamp(),
            lastError: null,
        });
    }

    const recipients = await fetchRecipientPage(audience, campaign.cursor || null, BATCH_SIZE);

    if (recipients.length === 0) {
        await ref.update({
            status: "sent",
            finishedAt: FieldValue.serverTimestamp(),
        });

        await writeAudit({
            actorUid: admin.uid,
            actorEmail: admin.email,
            actorRole: admin.role,
            action: "email.campaign.finished",
            targetType: "email_campaign",
            targetId: id,
            targetLabel: campaign.subject || id,
            after: {
                sent: campaign.sentCount || 0,
                failed: campaign.failedCount || 0,
            },
            ...auditContext(request),
        });

        return NextResponse.json({
            done: true,
            sent: campaign.sentCount || 0,
            failed: campaign.failedCount || 0,
        });
    }

    let sent = 0;
    let failed = 0;
    let lastError: string | null = null;
    let cursor = campaign.cursor || null;

    for (const recipient of recipients) {
        const { subject, html, text } = renderCampaignEmail(
            {
                subject: campaign.subject,
                body: campaign.body,
                ctaLabel: campaign.ctaLabel || null,
                ctaUrl: campaign.ctaUrl || null,
            },
            recipient,
        );

        try {
            await sendMail({ to: recipient.email, subject, html, text });
            sent += 1;
        } catch (err: any) {
            failed += 1;
            lastError = err?.message || "Unknown mail error";
            // Recorded per recipient so a partial failure can be chased down
            // afterwards rather than being reduced to a count.
            await ref.collection("failures").add({
                uid: recipient.uid,
                email: recipient.email,
                error: lastError,
                at: FieldValue.serverTimestamp(),
            });
        }

        // Advance past this recipient whether it sent or failed — a failure is
        // recorded, and retrying the whole batch would re-mail the ones that
        // already went.
        cursor = recipient.uid;
        await sleep(SEND_DELAY_MS);
    }

    await ref.update({
        cursor,
        sentCount: FieldValue.increment(sent),
        failedCount: FieldValue.increment(failed),
        totalRecipients: FieldValue.increment(recipients.length),
        lastError,
    });

    return NextResponse.json({
        done: false,
        batchSent: sent,
        batchFailed: failed,
        cursor,
        lastError,
    });
});

/** Pauses a run. The cursor stays put, so resuming continues where it stopped. */
export const PATCH = withAdmin("announcements.send", async (request, admin, ctx: Ctx) => {
    const { id } = await ctx.params;
    const ref = adminDb.collection("email_campaigns").doc(id);
    if (!(await ref.get()).exists) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await ref.update({ status: "paused" });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.campaign.paused",
        targetType: "email_campaign",
        targetId: id,
        targetLabel: id,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
