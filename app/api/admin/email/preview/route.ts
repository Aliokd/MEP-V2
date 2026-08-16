import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/email/send";
import { fetchRecipientPage, renderCampaignEmail } from "@/lib/email/campaigns";

export const dynamic = "force-dynamic";

/**
 * Renders a campaign as one recipient would see it, and counts the audience.
 *
 * The count matters more than the preview: "this goes to 1,240 people" is the
 * number an admin needs before pressing send, and it is the one thing a draft
 * cannot tell them on its own.
 */
export const POST = withAdmin("announcements.read", async (request, admin) => {
    const { subject, body, ctaLabel, ctaUrl, audience, test } = await request.json();

    if (!subject?.trim() || !body?.trim()) {
        return NextResponse.json({ error: "Subject and body are both needed" }, { status: 400 });
    }

    const filter = {
        tiers: Array.isArray(audience?.tiers) ? audience.tiers : [],
        locales: Array.isArray(audience?.locales) ? audience.locales : [],
    };

    // Counted by walking pages rather than with a count() query, because the
    // tier/locale/opt-out filtering happens in memory — a count() here would
    // report everyone, including the people who opted out, which is the one
    // number that must never be wrong.
    let audienceSize = 0;
    let cursor: string | null = null;
    let sampleName = "there";
    const HARD_CAP = 5000;

    for (let page = 0; page < 40; page++) {
        const batch: Awaited<ReturnType<typeof fetchRecipientPage>> =
            await fetchRecipientPage(filter, cursor, 200);
        if (batch.length === 0) break;
        if (page === 0 && batch[0]) sampleName = batch[0].name;
        audienceSize += batch.length;
        cursor = batch[batch.length - 1].uid;
        if (audienceSize >= HARD_CAP) break;
    }

    const rendered = renderCampaignEmail(
        { subject, body, ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null },
        { uid: "preview", name: sampleName },
    );

    // Optionally prove the whole path by sending it to the admin themselves.
    let testSentTo: string | null = null;
    if (test) {
        if (!admin.email) {
            return NextResponse.json({ error: "Your admin record has no email address" }, { status: 400 });
        }
        try {
            await sendMail({
                to: admin.email,
                subject: `[TEST] ${rendered.subject}`,
                html: rendered.html,
                text: rendered.text,
            });
            testSentTo = admin.email;
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
    }

    // How many people have opted out overall — context for the audience number.
    const optedOut = await adminDb
        .collection("users")
        .where("emailOptOut", "==", true)
        .count()
        .get()
        .then((s) => s.data().count)
        .catch(() => 0);

    return NextResponse.json({
        audienceSize,
        capped: audienceSize >= HARD_CAP,
        optedOut,
        subject: rendered.subject,
        html: rendered.html,
        testSentTo,
    });
});
