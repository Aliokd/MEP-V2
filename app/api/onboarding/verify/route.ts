import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { checkCode, CODE_LENGTH } from "@/lib/onboardingCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The code at the end of onboarding.
 *
 * The caller is already signed in as the account (the start route handed out
 * a custom token), so the token names the account and the body carries only
 * the six digits. A match marks the address verified in Firebase Auth and on
 * the user doc, and then does one more thing: it revokes every session on the
 * account and hands back a fresh custom token for this one. Anyone who typed
 * this address into the email step before its real owner did was signed in
 * as the same unverified account; the code only ever reached the inbox, so
 * whoever presents it is the owner, and the revocation is what ends the other
 * session.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const { uid } = auth;

    const throttled = rateLimitGuard(request, "onboarding-verify", uid);
    if (throttled) return throttled;

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return NextResponse.json({ error: "invalid-body" }, { status: 400 });
    }

    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
    if (code.length !== CODE_LENGTH) {
        return NextResponse.json({ error: "code-invalid" }, { status: 400 });
    }

    const result = await checkCode(uid, code);
    if (!result.ok) {
        const status = result.reason === "locked" ? 429 : 400;
        return NextResponse.json({ error: `code-${result.reason}` }, { status });
    }

    try {
        await adminAuth.updateUser(uid, { emailVerified: true });
        await adminDb.doc(`users/${uid}`).set(
            { signup: { verifiedAt: new Date().toISOString() } },
            { merge: true },
        );
        await adminAuth.revokeRefreshTokens(uid);
        const token = await adminAuth.createCustomToken(uid);
        return NextResponse.json({ success: true, token });
    } catch (error) {
        console.error("[onboarding/verify] finishing the account failed:", error);
        return NextResponse.json({ error: "verify-failed" }, { status: 500 });
    }
}
