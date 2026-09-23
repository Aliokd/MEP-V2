import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { isPendingOnboarding } from "@/lib/onboardingCodes";
import { RESUMABLE_STEPS, type ResumableStep } from "@/lib/onboardingResume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remembers how far an unfinished signup got, on the account itself.
 *
 * The answers already travel to the account as they are given; this adds
 * the step (verdict, offer or paywall), so both the day-after email's link
 * and a return visit in the same browser land where the person stopped
 * instead of at the start of the quiz. Only written for an account still
 * pending: once the flow is finished there is nothing to resume.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const { uid } = auth;

    const throttled = rateLimitGuard(request, "onboarding-progress", uid);
    if (throttled) return throttled;

    const body = await request.json().catch(() => ({}));
    const step = body?.step as ResumableStep;
    if (!RESUMABLE_STEPS.includes(step)) {
        return NextResponse.json({ error: "invalid-step" }, { status: 400 });
    }

    const account = await adminAuth.getUser(uid).catch(() => null);
    if (!account || !(await isPendingOnboarding(uid, account.emailVerified))) {
        return NextResponse.json({ saved: false, reason: "not-pending" });
    }

    await adminDb.doc(`users/${uid}`).set(
        { signup: { lastStep: step, lastStepAt: new Date().toISOString() } },
        { merge: true },
    );
    return NextResponse.json({ saved: true });
}
