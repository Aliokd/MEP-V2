import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { consoleView } from "@/lib/goldenAdmin";
import { issueTicketForUser } from "@/lib/goldenGrants";
import { GOLDEN_TICKETS_TOTAL } from "@/lib/uiFlags";

export const dynamic = "force-dynamic";

/**
 * Activating one particular ticket for one particular person: the second way
 * into the golden hundred.
 *
 * The first way is the tier. An admin sets somebody to Lifetime Pro in Users
 * and the ticket follows automatically, taking the next free number. This is
 * the other direction, for when the ticket is the thing being chosen: an
 * admin presses an empty ticket on the console's wall, picks who it belongs
 * to, and this hands them that number and the lifetime access that goes with
 * it. Both ways end in the same place, which is the point.
 *
 * The tier is written here rather than left to the caller, because a ticket
 * that did not open the product would be a prop. It is written first: if the
 * ticket then fails, the person still has what the ticket promises, which is
 * the right way round to fail.
 */
export const POST = withAdmin("golden.write", async (request, admin) => {
    const body = await request.json().catch(() => ({}));

    const uid = typeof body.uid === "string" ? body.uid.trim() : "";
    const number = Number(body.number);
    const listed = body.listed !== false;

    if (!uid) return NextResponse.json({ error: "Pick the account this ticket belongs to" }, { status: 400 });
    if (!Number.isInteger(number) || number < 1 || number > GOLDEN_TICKETS_TOTAL) {
        return NextResponse.json({ error: `A ticket number between 1 and ${GOLDEN_TICKETS_TOTAL} is required` }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return NextResponse.json({ error: "That account does not exist" }, { status: 404 });
    const user = snap.data() ?? {};

    if (typeof user.golden?.ticket === "string") {
        return NextResponse.json(
            { error: `${user.email || "That account"} already holds a golden ticket. Delete it first to move them.` },
            { status: 409 },
        );
    }

    const previousTier = user.tier ?? null;
    if (previousTier !== "comp") {
        await userRef.update({ tier: "comp" });
    }

    const result = await issueTicketForUser({
        uid,
        name: user.name || null,
        email: user.email || null,
        number,
        listed,
        issuedBy: admin.uid,
    });

    if (result.outcome !== "issued" || !result.ticket) {
        // The tier stands either way; say precisely which door closed.
        const message =
            result.outcome === "number-taken"
                ? `Ticket ${number} has just been taken. Refresh the wall and pick another.`
                : result.outcome === "existing"
                  ? "That account already holds a ticket."
                  : result.outcome === "wall-full"
                    ? "The wall is full."
                    : "The ticket could not be issued.";
        return NextResponse.json({ error: message, tierSet: previousTier !== "comp" }, { status: 409 });
    }

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "golden.assign",
        targetType: "golden_ticket",
        targetId: result.ticket.slug,
        targetLabel: `${number}. ${result.ticket.name}`,
        before: { tier: previousTier },
        after: { uid, email: user.email ?? null, tier: "comp", number, listed },
        ...auditContext(request),
    });

    return NextResponse.json({
        ticket: consoleView(result.ticket),
        tierChanged: previousTier !== "comp",
        previousTier,
    });
});
