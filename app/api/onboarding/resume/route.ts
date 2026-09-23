import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { rateLimitGuard } from "@/lib/rateLimit";
import { isPendingOnboarding } from "@/lib/onboardingCodes";
import { findResumeToken, resumeStep } from "@/lib/onboardingResume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens an unfinished signup from the link in the day-after email.
 *
 * The link reached the inbox the account was made with, which is the same
 * proof the six-digit code gives, so this finishes the verification the
 * code would have: the address is marked verified, every other session on
 * the account ends, and the browser gets a fresh token. Then it hands back
 * what the flow needs to pick up where it stopped: the answers and the step.
 *
 * Unauthenticated by nature (the person may be on another device), rate
 * limited by IP. The token is single-use and expires; see lib/onboardingResume.ts.
 */
export async function POST(request: Request) {
    const throttled = rateLimitGuard(request, "onboarding-resume");
    if (throttled) return throttled;

    const body = await request.json().catch(() => ({}));
    const found = await findResumeToken(String(body?.token ?? ""));
    if (!found.ok) {
        return NextResponse.json({ error: `link-${found.reason}` }, { status: found.reason === "invalid" ? 400 : 410 });
    }

    const account = await adminAuth.getUser(found.uid).catch(() => null);
    if (!account) return NextResponse.json({ error: "link-invalid" }, { status: 400 });

    // Finished some other way since the email went out (the code, or a
    // checkout and code on another visit): the link has nothing left to do,
    // and signing in is the way back.
    if (!(await isPendingOnboarding(found.uid, account.emailVerified))) {
        await found.ref.set({ usedAt: new Date().toISOString(), usedFor: "already-finished" }, { merge: true });
        return NextResponse.json({ error: "already-finished" }, { status: 409 });
    }

    try {
        const now = new Date().toISOString();
        await adminAuth.updateUser(found.uid, { emailVerified: true });
        await adminDb.doc(`users/${found.uid}`).set(
            { signup: { verifiedAt: now, verifiedBy: "resume-link" } },
            { merge: true },
        );
        await found.ref.set({ usedAt: now }, { merge: true });
        await adminAuth.revokeRefreshTokens(found.uid);
        const token = await adminAuth.createCustomToken(found.uid);

        const d = (await adminDb.doc(`users/${found.uid}`).get()).data() ?? {};
        return NextResponse.json({
            success: true,
            token,
            email: account.email ?? found.email,
            answers: d.answers ?? {},
            step: resumeStep(d.signup?.lastStep),
            source: typeof d.signup?.source === "string" ? d.signup.source : null,
            hasPlan: Boolean(d.billing?.paddleSubscriptionId),
        });
    } catch (error) {
        console.error("[onboarding/resume] finishing the account failed:", error);
        return NextResponse.json({ error: "resume-failed" }, { status: 500 });
    }
}
