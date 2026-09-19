import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { checkCode, isPendingOnboarding, CODE_LENGTH } from "@/lib/onboardingCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The code at the end of onboarding.
 *
 * Two callers:
 *
 *   - The browser that made the account is signed in as it (the start route
 *     handed out a custom token), so the token names the account and the
 *     body carries only the six digits.
 *   - A browser resuming a pending account it never held (the person came
 *     back later, or from another device) has no token: the start route sent
 *     a fresh code and nothing else. It sends the address with the code, and
 *     the match is what signs it in.
 *
 * Either way a match marks the address verified in Firebase Auth and on the
 * user doc, revokes every session on the account and hands back a fresh
 * custom token for this one. The code only ever reached the inbox, so whoever
 * presents it is the owner, and the revocation is what ends any other session.
 */
export async function POST(request: Request) {
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

    let uid: string;
    let email: string | null;

    const bearer = /^Bearer\s+/i.test(request.headers.get("authorization") ?? "");
    if (bearer) {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        uid = auth.uid;
        const throttled = rateLimitGuard(request, "onboarding-verify", uid);
        if (throttled) return throttled;
        email = (await adminAuth.getUser(uid)).email?.toLowerCase() ?? null;
    } else {
        // No session: the address names the account. Throttled by IP, and
        // only a pending onboarding account can be finished this way; every
        // other kind of account answers as if the code were wrong, so the
        // route does not say which addresses have accounts.
        const throttled = rateLimitGuard(request, "onboarding-verify");
        if (throttled) return throttled;

        const given = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!EMAIL_PATTERN.test(given) || given.length > 254) {
            return NextResponse.json({ error: "code-invalid" }, { status: 400 });
        }
        const account = await adminAuth.getUserByEmail(given).catch(() => null);
        if (!account || !(await isPendingOnboarding(account.uid, account.emailVerified))) {
            return NextResponse.json({ error: "code-invalid" }, { status: 400 });
        }
        uid = account.uid;
        email = given;
    }

    const result = await checkCode(uid, code, email);
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
        // Whether a checkout already happened on an earlier visit, so a
        // resumed account is not sent through the plan step a second time.
        const billing = (await adminDb.doc(`users/${uid}`).get()).data()?.billing;
        const hasPlan = Boolean(billing?.paddleSubscriptionId);
        return NextResponse.json({ success: true, token, hasPlan });
    } catch (error) {
        console.error("[onboarding/verify] finishing the account failed:", error);
        return NextResponse.json({ error: "verify-failed" }, { status: 500 });
    }
}
