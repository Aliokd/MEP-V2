import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import { goldenTicketEmail } from "@/lib/email/templates/goldenTicket";
import { resolveLocale } from "@/lib/email/locale";
import { getCopyOverrides } from "@/lib/siteCopy";
import { COLLECTION, getTicket } from "@/lib/goldenTickets";
import { goldenLandingPath } from "@/lib/uiFlags";
import { cleanEmail } from "@/lib/goldenAdmin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Sends the ticket email by hand.
 *
 * Two uses. A claimed ticket whose email never arrived (the relay failed,
 * or it went to spam) is sent again to the claimed address. And an open
 * ticket can be sent straight to an address the founders already have,
 * skipping the page: that takes the claim on the person's behalf, so the
 * wall shows it taken and nobody else can claim it after.
 *
 * An address in the body wins over the one on record, for the case where
 * the person wrote back from a different one.
 *
 * The admin controls what goes out. `subject` replaces the template's, and
 * `note` is a line written for this person that sits high in the email. The
 * mode follows the ticket: one already redeemed on an account is announced
 * as theirs rather than telling them to redeem a code they cannot use.
 */
export const POST = withAdmin("golden.write", async (request, admin, ctx: Ctx) => {
    const { slug } = await ctx.params;
    const ticket = await getTicket(slug);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (ticket.status === "revoked") return NextResponse.json({ error: "The ticket is revoked" }, { status: 409 });

    const body = await request.json().catch(() => ({}));
    const override = body.email ? cleanEmail(body.email) : null;
    if (body.email && !override) return NextResponse.json({ error: "That email address is not valid" }, { status: 400 });

    const to = override ?? ticket.claim?.email ?? ticket.email;
    if (!to) return NextResponse.json({ error: "No address to send to: add one to the ticket first" }, { status: 400 });

    const locale = resolveLocale(body.locale ?? ticket.claim?.locale);
    const subjectOverride = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : null;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : null;
    const mode = ticket.status === "redeemed" ? "granted" : "invite";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
    const { subject, html, text } = goldenTicketEmail(
        locale,
        {
            name: ticket.name,
            code: ticket.code,
            redeemUrl: `${appUrl}${goldenLandingPath(ticket.code)}`,
            pageUrl: `${appUrl}/golden/${ticket.slug}`,
            invites: ticket.invites,
            mode,
            personalNote: note,
            subject: subjectOverride,
        },
        await getCopyOverrides(),
    );

    try {
        await sendMail({ to, subject, html, text });
    } catch (error) {
        const message = error instanceof Error ? error.message : "The email could not be sent";
        return NextResponse.json({ error: message }, { status: 502 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now, lastSentAt: now, lastSentTo: to };
    if (ticket.status === "open") {
        updates.status = "claimed";
        updates.claim = { email: to, message: null, locale, claimedAt: now, byAdmin: admin.uid };
    }
    await adminDb.collection(COLLECTION).doc(slug).update(updates);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "golden.send",
        targetType: "golden_ticket",
        targetId: slug,
        targetLabel: `${ticket.number}. ${ticket.name}`,
        after: { to, mode, customSubject: Boolean(subjectOverride), customNote: Boolean(note) },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, to });
});
