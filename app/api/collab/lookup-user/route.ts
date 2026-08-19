import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Resolves an email address to the account that holds it, for collaborator invites.
 *
 * This lookup used to run in the browser as
 * `query(collection(db,'users'), where('email','==',…))`, which required
 * users/{uid} to be world-readable to signed-in accounts — and so handed back
 * the entire user document, billing record included, for whatever address was
 * typed. Running it here with the Admin SDK means the rule can stay closed and
 * the response can carry only what an invite actually needs: a uid and a name.
 *
 * Whether an address has an account is still observable, which is unavoidable
 * for invite-by-email — you cannot tell someone "already on Veinote" without
 * telling them that. The rate limit is what keeps it from being a bulk
 * enumeration tool, and no data beyond existence and a display name is returned.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const limited = rateLimitGuard(request, "collab-lookup", auth.uid);
    if (limited) return limited;

    let email: unknown;
    try {
        ({ email } = await request.json());
    } catch {
        return NextResponse.json({ error: "Malformed request" }, { status: 400 });
    }

    if (typeof email !== "string" || !email.trim()) {
        return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const cleaned = email.toLowerCase().trim();

    const snap = await adminDb
        .collection("users")
        .where("email", "==", cleaned)
        .limit(1)
        .get();

    if (snap.empty) {
        return NextResponse.json({ found: false });
    }

    const doc = snap.docs[0];
    const data = doc.data() || {};

    return NextResponse.json({
        found: true,
        uid: doc.id,
        name: (data.name || "").trim() || "Collaborator",
    });
}
