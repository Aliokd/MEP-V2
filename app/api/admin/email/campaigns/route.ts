import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { newCampaignId } from "@/lib/email/campaigns";

export const dynamic = "force-dynamic";

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "number") return value;
    return null;
}

export const GET = withAdmin("announcements.read", async () => {
    const snap = await adminDb
        .collection("email_campaigns")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
        .catch(() => null);

    return NextResponse.json({
        campaigns: (snap?.docs || []).map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                createdAt: toMillis(d.createdAt),
                startedAt: toMillis(d.startedAt),
                finishedAt: toMillis(d.finishedAt),
            };
        }),
    });
});

/**
 * Creates a campaign as a draft. Nothing is sent here — sending is a separate,
 * explicitly-triggered, batched operation, so writing a campaign can never
 * accidentally mail a few thousand people.
 */
export const POST = withAdmin("announcements.write", async (request, admin) => {
    const { name, subject, body, ctaLabel, ctaUrl, audience } = await request.json();

    if (!subject?.trim()) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
    if (!body?.trim()) return NextResponse.json({ error: "The email body is empty" }, { status: 400 });
    if (ctaLabel && !ctaUrl) {
        return NextResponse.json({ error: "A button needs a link" }, { status: 400 });
    }

    const id = newCampaignId(name || subject);

    await adminDb.collection("email_campaigns").doc(id).set({
        id,
        name: (name || subject).trim(),
        subject: subject.trim(),
        body: body.trim(),
        ctaLabel: ctaLabel?.trim() || null,
        ctaUrl: ctaUrl?.trim() || null,
        audience: {
            tiers: Array.isArray(audience?.tiers) ? audience.tiers : [],
            locales: Array.isArray(audience?.locales) ? audience.locales : [],
        },
        status: "draft",
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        cursor: null,
        createdByEmail: admin.email,
        createdAt: FieldValue.serverTimestamp(),
        startedAt: null,
        finishedAt: null,
        lastError: null,
    });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.campaign.create",
        targetType: "email_campaign",
        targetId: id,
        targetLabel: subject.trim(),
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, id });
});
