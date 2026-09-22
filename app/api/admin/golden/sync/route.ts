import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { listUnticketedLifetimeUsers } from "@/lib/goldenAdmin";
import { issueTicketForUser } from "@/lib/goldenGrants";

export const dynamic = "force-dynamic";

/**
 * Closes the gap between lifetime accounts and the wall.
 *
 * Every account on the lifetime tier is meant to hold one of the hundred, and
 * the console issues a ticket with each grant. This is for the cases where
 * that did not happen: accounts granted lifetime before the program existed,
 * a grant made while the wall was full, or a ticket an admin has since
 * deleted. It hands each of them the next free number.
 *
 * Idempotent by construction — it only ever acts on accounts with no ticket,
 * so running it twice is running it once. It stops when the wall is full and
 * reports who is left rather than forcing anyone on.
 */
export const POST = withAdmin("golden.write", async (request, admin) => {
    const body = await request.json().catch(() => ({}));
    const listed = body.listed !== false;

    const waiting = await listUnticketedLifetimeUsers();
    if (!waiting.length) {
        return NextResponse.json({ issued: [], skipped: [], remaining: 0, message: "Every lifetime account already holds a ticket." });
    }

    const issued: { uid: string; email: string | null; slug: string; number: number }[] = [];
    const skipped: { uid: string; email: string | null; reason: string }[] = [];

    for (const user of waiting) {
        try {
            const result = await issueTicketForUser({
                uid: user.uid,
                name: user.name,
                email: user.email,
                listed,
                issuedBy: admin.uid,
            });
            if (result.outcome === "issued" && result.ticket) {
                issued.push({ uid: user.uid, email: user.email, slug: result.ticket.slug, number: result.ticket.number });
            } else if (result.outcome === "wall-full") {
                skipped.push({ uid: user.uid, email: user.email, reason: "the wall is full" });
                // Nothing after this can succeed either.
                break;
            } else {
                skipped.push({ uid: user.uid, email: user.email, reason: result.outcome });
            }
        } catch (err) {
            console.error("[admin/golden/sync] issuing failed for", user.uid, err);
            skipped.push({ uid: user.uid, email: user.email, reason: "failed" });
        }
    }

    if (issued.length) {
        await writeAudit({
            actorUid: admin.uid,
            actorEmail: admin.email,
            actorRole: admin.role,
            action: "golden.sync",
            targetType: "golden_ticket",
            targetId: "batch",
            targetLabel: `${issued.length} issued`,
            after: { listed, issued: issued.map((i) => `${i.number} ${i.slug}`) },
            ...auditContext(request),
        });
    }

    return NextResponse.json({
        issued,
        skipped,
        remaining: waiting.length - issued.length,
    });
});
