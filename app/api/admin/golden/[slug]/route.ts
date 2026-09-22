import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { COLLECTION, getTicket, isStatus, newGoldenCode } from "@/lib/goldenTickets";
import { cleanEmail, cleanPhotoUrl, cleanText, consoleView, MAX_NAME, MAX_NOTE, MAX_TAGLINE } from "@/lib/goldenAdmin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Edits a ticket. Three kinds of change, each its own action in the audit:
 *
 *   fields    name, tagline, note, photo, email: the page and the record
 *   status    open (a reset: forgets the claim), revoked (pulled from the
 *             wall; the page says so). Redeemed is set by the redeem route
 *             only, since it goes with a tier on an account.
 *   newCode   a fresh code, when the old one leaked or went to the wrong
 *             inbox. The old one stops working at once.
 */
export const PATCH = withAdmin("golden.write", async (request, admin, ctx: Ctx) => {
    const { slug } = await ctx.params;
    const ticket = await getTicket(slug);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    const actions: string[] = [];

    if ("name" in body) {
        const name = cleanText(body.name, MAX_NAME);
        if (!name) return NextResponse.json({ error: "A name is required" }, { status: 400 });
        updates.name = name;
    }
    if ("tagline" in body) updates.tagline = cleanText(body.tagline, MAX_TAGLINE);
    if ("note" in body) updates.note = cleanText(body.note, MAX_NOTE);
    if ("photoUrl" in body) {
        const photoUrl = body.photoUrl ? cleanPhotoUrl(body.photoUrl) : null;
        if (body.photoUrl && !photoUrl) return NextResponse.json({ error: "The photo must be an https URL or a path under /" }, { status: 400 });
        updates.photoUrl = photoUrl;
    }
    if ("email" in body) {
        const email = body.email ? cleanEmail(body.email) : null;
        if (body.email && !email) return NextResponse.json({ error: "That email address is not valid" }, { status: 400 });
        updates.email = email;
    }
    if (Object.keys(updates).length) actions.push("golden.edit");

    // Whether the ticket hangs on the public wall. A ticket issued with a
    // lifetime grant goes up by default, marked taken, because that is how a
    // visitor sees how many of the hundred are gone; the team's own accounts
    // are the ones to take down.
    if ("listed" in body) {
        const listed = Boolean(body.listed);
        if (listed !== ticket.listed) {
            updates.listed = listed;
            actions.push(listed ? "golden.list" : "golden.unlist");
        }
    }

    if ("status" in body) {
        const status = body.status;
        if (!isStatus(status) || status === "redeemed" || status === "claimed") {
            return NextResponse.json({ error: "Status can be set to open or revoked" }, { status: 400 });
        }
        if (ticket.status === "redeemed" && status === "open") {
            // The account keeps its tier; reopening would let a second person
            // redeem a ticket already on someone's account. Mint a new one.
            return NextResponse.json({ error: "A redeemed ticket cannot be reopened. Create a new ticket instead." }, { status: 409 });
        }
        updates.status = status;
        if (status === "open") updates.claim = null;
        actions.push(status === "revoked" ? "golden.revoke" : "golden.reset");
    }

    if (body.newCode === true) {
        updates.code = newGoldenCode();
        actions.push("golden.recode");
    }

    if (!actions.length) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });

    updates.updatedAt = new Date().toISOString();
    await adminDb.collection(COLLECTION).doc(slug).update(updates);

    // Revoking a ticket somebody holds also takes it off their account, so the
    // platform stops showing them a golden card that links to a dead ticket.
    // Their tier is left alone on purpose: lifetime access is granted and taken
    // away in Users, and doing it silently from here would hide the decision.
    if (updates.status === "revoked" && ticket.redeemedBy?.uid) {
        await adminDb
            .doc(`users/${ticket.redeemedBy.uid}`)
            .set({ golden: FieldValue.delete() }, { merge: true })
            .catch((err) => console.error("[admin/golden] clearing the holder's ticket failed:", err));
    }

    for (const action of actions) {
        await writeAudit({
            actorUid: admin.uid,
            actorEmail: admin.email,
            actorRole: admin.role,
            action,
            targetType: "golden_ticket",
            targetId: slug,
            targetLabel: `${ticket.number}. ${ticket.name}`,
            ...auditContext(request),
        });
    }

    const fresh = await getTicket(slug);
    return NextResponse.json({ ticket: fresh ? consoleView(fresh) : null });
});

/**
 * Removes a ticket from the wall for good, and gives its number back: the
 * hundred is a hundred, so a deleted ticket is a free spot for the next
 * person chosen.
 *
 * A ticket somebody holds may be deleted too. It takes the ticket off their
 * account, so the platform stops showing them a golden card that leads
 * nowhere, but it does NOT touch their tier: lifetime access is granted and
 * taken away in Users, and doing it silently from here would hide the
 * decision. The console says as much before it asks.
 */
export const DELETE = withAdmin("golden.write", async (request, admin, ctx: Ctx) => {
    const { slug } = await ctx.params;
    const ticket = await getTicket(slug);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const holderUid = ticket.redeemedBy?.uid ?? null;
    if (holderUid) {
        await adminDb
            .doc(`users/${holderUid}`)
            .set({ golden: FieldValue.delete() }, { merge: true })
            .catch((err) => console.error("[admin/golden] clearing the holder's ticket failed:", err));
    }

    await adminDb.collection(COLLECTION).doc(slug).delete();
    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "golden.delete",
        targetType: "golden_ticket",
        targetId: slug,
        targetLabel: `${ticket.number}. ${ticket.name}`,
        before: { number: ticket.number, name: ticket.name, status: ticket.status },
        after: { spotFreed: ticket.number, holderDetached: holderUid },
        ...auditContext(request),
    });
    return NextResponse.json({ success: true, spotFreed: ticket.number, holderDetached: Boolean(holderUid) });
});
