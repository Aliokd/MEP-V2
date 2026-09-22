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
import { cleanEmail, cleanPhotoUrl, cleanText, consoleView, listUnticketedLifetimeUsers, MAX_NAME, MAX_NOTE, MAX_TAGLINE } from "@/lib/goldenAdmin";
import { GOLDEN_INVITES_PER_TICKET, GOLDEN_TICKETS_TOTAL } from "@/lib/uiFlags";
import { roleHasPermission } from "@/lib/admin/roles";

export const dynamic = "force-dynamic";

/** The wall, oldest number first, with the counts the page header shows. */
export const GET = withAdmin("golden.read", async (_request, admin) => {
    const tickets = await listTickets();
    const counts = { open: 0, claimed: 0, redeemed: 0, revoked: 0 };
    tickets.forEach((t) => { counts[t.status] += 1; });
    const withCode = roleHasPermission(admin.role, "golden.write");
    // A revoked ticket holds no number, so the free count is what the wall
    // can still take, not a hundred minus every row ever written.
    const held = tickets.filter((t) => t.status !== "revoked").length;
    const unticketed = await listUnticketedLifetimeUsers().catch((err) => {
        console.error("[admin/golden] listing lifetime accounts without a ticket failed:", err);
        return [];
    });

    return NextResponse.json({
        tickets: tickets.map((t) => consoleView(t, { withCode })),
        counts,
        total: GOLDEN_TICKETS_TOTAL,
        invitesPerTicket: GOLDEN_INVITES_PER_TICKET,
        capacity: { held, free: Math.max(0, GOLDEN_TICKETS_TOTAL - held) },
        unticketed,
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

    // A place on the wall may be named — that is what pressing an empty
    // ticket in the console does — or left to the next free one.
    let number: number;
    if (body.number !== undefined && body.number !== null) {
        const wanted = Number(body.number);
        if (!Number.isInteger(wanted) || wanted < 1 || wanted > GOLDEN_TICKETS_TOTAL) {
            return NextResponse.json({ error: `A ticket number between 1 and ${GOLDEN_TICKETS_TOTAL} is required` }, { status: 400 });
        }
        const held = (await listTickets()).some((t) => t.number === wanted && t.status !== "revoked");
        if (held) return NextResponse.json({ error: `Ticket ${wanted} is already taken` }, { status: 409 });
        number = wanted;
    } else {
        const next = await nextFreeNumber();
        if (next === null) {
            return NextResponse.json({ error: `The wall is full: all ${GOLDEN_TICKETS_TOTAL} tickets exist` }, { status: 409 });
        }
        number = next;
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
        // Written out rather than left to the reader's default: a ticket
        // chosen here is the campaign, so it hangs on the wall, and the
        // console's own reply should say so without a reload.
        listed: true,
        origin: "console" as const,
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
