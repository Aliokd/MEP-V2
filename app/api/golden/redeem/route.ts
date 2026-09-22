import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { COLLECTION, findTicketByCode } from "@/lib/goldenTickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A golden code, used.
 *
 * The caller is signed in (the onboarding email step made the account and
 * signed the browser in, or the person already had one), and the body holds
 * the code. A live code puts the account on the complimentary tier, which
 * useUserPlan reads as the whole product for as long as the account exists,
 * and marks the ticket redeemed by this uid so it cannot be used twice.
 *
 * The tier is written here with the Admin SDK because firestore.rules keeps
 * `tier` out of every client's hands; that rule is what makes this grant
 * worth something.
 *
 * An account that already holds a golden ticket is told so and nothing
 * changes: one ticket per account, one account per ticket.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const { uid } = auth;

    const throttled = rateLimitGuard(request, "golden-redeem", uid);
    if (throttled) return throttled;

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return NextResponse.json({ error: "invalid-body" }, { status: 400 });
    }

    const code = typeof body.code === "string" ? body.code : "";
    const ticket = await findTicketByCode(code);
    if (!ticket || ticket.status === "revoked") {
        return NextResponse.json({ error: "code-invalid" }, { status: 400 });
    }

    // The code was mailed to one address; the account redeeming it must be
    // that address. A code seen over someone's shoulder, or forwarded, is
    // worth nothing to an account with a different email.
    const claimedFor = (ticket.claim?.email || ticket.email || "").trim().toLowerCase();
    const account = await adminAuth.getUser(uid).catch(() => null);
    const accountEmail = account?.email?.toLowerCase() ?? "";
    if (!claimedFor || !accountEmail || claimedFor !== accountEmail) {
        console.warn(`[golden/redeem] ${ticket.slug}: account ${uid} (${accountEmail || "no email"}) is not the claimed address`);
        return NextResponse.json({ error: "code-invalid" }, { status: 400 });
    }

    // The same account pressing again (a reload mid-flow) is a success, not
    // a refusal: the grant it asks for is already in place.
    if (ticket.status === "redeemed") {
        if (ticket.redeemedBy?.uid === uid) return NextResponse.json({ success: true, already: true });
        return NextResponse.json({ error: "code-used" }, { status: 409 });
    }

    const userRef = adminDb.doc(`users/${uid}`);
    const ticketRef = adminDb.collection(COLLECTION).doc(ticket.slug);
    const now = new Date().toISOString();

    try {
        const result = await adminDb.runTransaction(async (tx) => {
            const [userSnap, ticketSnap] = await Promise.all([tx.get(userRef), tx.get(ticketRef)]);
            if (!userSnap.exists) return "no-account" as const;
            if (userSnap.data()?.golden?.ticket) return "has-ticket" as const;
            if (ticketSnap.data()?.status === "redeemed") return "used" as const;
            if (ticketSnap.data()?.status === "revoked") return "invalid" as const;

            tx.update(ticketRef, {
                status: "redeemed",
                // The address is kept beside the uid so the console can say
                // who holds a ticket without a second lookup per row.
                redeemedBy: { uid, at: now, email: userSnap.data()?.email ?? null },
                updatedAt: now,
            });
            tx.set(userRef, {
                tier: "comp",
                golden: { ticket: ticket.slug, redeemedAt: now, invites: ticket.invites },
            }, { merge: true });
            return "ok" as const;
        });

        if (result === "no-account") return NextResponse.json({ error: "no-account" }, { status: 404 });
        if (result === "has-ticket") return NextResponse.json({ error: "has-ticket" }, { status: 409 });
        if (result === "used") return NextResponse.json({ error: "code-used" }, { status: 409 });
        if (result === "invalid") return NextResponse.json({ error: "code-invalid" }, { status: 400 });
    } catch (error) {
        console.error("[golden/redeem] failed:", error);
        return NextResponse.json({ error: "redeem-failed" }, { status: 500 });
    }

    // The name on the ticket is the founders' spelling of it, which beats the
    // part before the @ that the email step gave the account.
    try {
        const user = await adminAuth.getUser(uid);
        if (!user.displayName || user.displayName === user.email?.split("@")[0]) {
            await adminAuth.updateUser(uid, { displayName: ticket.name });
            await userRef.set({ name: ticket.name }, { merge: true });
            await adminDb.doc(`publicProfiles/${uid}`).set({ name: ticket.name }, { merge: true });
        }
    } catch {
        /* the grant is in; the name is a courtesy */
    }

    return NextResponse.json({ success: true, name: ticket.name, invites: ticket.invites });
}
