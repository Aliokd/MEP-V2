import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import {
    COLLECTION,
    freeSlug,
    listTickets,
    newGoldenCode,
    nextFreeNumber,
    type GoldenTicket,
} from "@/lib/goldenTickets";
import { cleanEmail, cleanPhotoUrl, cleanText, consoleView, MAX_NAME, MAX_NOTE, MAX_TAGLINE } from "@/lib/goldenAdmin";
import { GOLDEN_INVITES_PER_TICKET, GOLDEN_TICKETS_TOTAL } from "@/lib/uiFlags";

export const dynamic = "force-dynamic";

/** The wall, oldest number first, with the counts the page header shows. */
export const GET = withAdmin("golden.read", async () => {
    const tickets = await listTickets();
    const counts = { open: 0, claimed: 0, redeemed: 0, revoked: 0 };
    tickets.forEach((t) => { counts[t.status] += 1; });
    return NextResponse.json({
        tickets: tickets.map(consoleView),
        counts,
        total: GOLDEN_TICKETS_TOTAL,
        invitesPerTicket: GOLDEN_INVITES_PER_TICKET,
    });
});

/**
 * Mints a ticket: a slug from the name, the next free number on the wall,
 * a fresh code. Nothing is sent; the person is written to when they take
 * the ticket on their page, or when an admin presses resend after that.
 */
export const POST = withAdmin("golden.write", async (request, admin) => {
    const body = await request.json().catch(() => ({}));

    const name = cleanText(body.name, MAX_NAME);
    if (!name) return NextResponse.json({ error: "A name is required" }, { status: 400 });

    const photoUrl = body.photoUrl ? cleanPhotoUrl(body.photoUrl) : null;
    if (body.photoUrl && !photoUrl) {
        return NextResponse.json({ error: "The photo must be an https URL or a path under /" }, { status: 400 });
    }
    const email = body.email ? cleanEmail(body.email) : null;
    if (body.email && !email) return NextResponse.json({ error: "That email address is not valid" }, { status: 400 });

    const number = await nextFreeNumber();
    if (number === null) {
        return NextResponse.json({ error: `The wall is full: all ${GOLDEN_TICKETS_TOTAL} tickets exist` }, { status: 409 });
    }

    const slug = await freeSlug(name);
    const now = new Date().toISOString();
    const doc = {
        number,
        name,
        tagline: cleanText(body.tagline, MAX_TAGLINE),
        note: cleanText(body.note, MAX_NOTE),
        photoUrl,
        email,
        code: newGoldenCode(),
        status: "open",
        claim: null,
        redeemedBy: null,
        invites: GOLDEN_INVITES_PER_TICKET,
        createdAt: now,
        updatedAt: now,
        createdBy: admin.uid,
    };
    await adminDb.collection(COLLECTION).doc(slug).set(doc);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "golden.create",
        targetType: "golden_ticket",
        targetId: slug,
        targetLabel: `${number}. ${name}`,
        ...auditContext(request),
    });

    return NextResponse.json({ ticket: consoleView({ ...doc, slug, status: "open", claim: null, redeemedBy: null } as GoldenTicket) });
});
