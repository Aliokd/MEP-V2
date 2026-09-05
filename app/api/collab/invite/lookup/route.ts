import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { rateLimitGuard } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Firestore document ids: no slashes, nothing long enough to be a payload. */
const INVITE_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * What an invitation link is worth, asked by the onboarding flow before it
 * opens the account step to someone while public signups are closed.
 *
 * An invited person is let in ahead of the waiting list, so the thing that
 * lets them in has to be checked here, server-side, against the invitation
 * itself — not inferred from a query string anyone can type. A link is good
 * when its invitation exists, is still pending, and was addressed to an email
 * with no account yet (an invite to an existing account never comes this way;
 * that person just signs in).
 *
 * Unauthenticated by necessity — the caller has no account, that is the point —
 * so it is rate-limited by IP and says as little as it can: who invited them,
 * to what, and the address the invite went to, which is the address the link
 * was mailed to in the first place. Every miss is the same `valid: false`.
 */
export async function GET(request: Request) {
    const throttled = rateLimitGuard(request, "collab-invite-lookup");
    if (throttled) return throttled;

    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!INVITE_ID_PATTERN.test(id)) {
        return NextResponse.json({ valid: false });
    }

    try {
        const snap = await adminDb.doc(`invitations/${id}`).get();
        if (!snap.exists) return NextResponse.json({ valid: false });
        const data = snap.data() ?? {};

        const pending = data.status === "pending";
        const addressedToEmail = typeof data.inviteeEmail === "string" && data.inviteeEmail && !data.inviteeId;
        if (!pending || !addressedToEmail) {
            // Answered, or addressed to an account that already exists. The
            // second case is not a refusal: onboarding sends them to sign in.
            return NextResponse.json({ valid: false, reason: pending ? "has-account" : "answered" });
        }

        return NextResponse.json({
            valid: true,
            inviterName: data.senderName ?? null,
            projectTitle: data.projectTitle ?? null,
            inviteeEmail: data.inviteeEmail,
        });
    } catch (err) {
        console.error("[invite/lookup] failed:", err);
        return NextResponse.json({ valid: false });
    }
}
