import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { getPaddle, type StoredBilling } from "@/lib/paddle/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Takes back a cancellation that has not happened yet.
 *
 * A subscription cancelled from Settings keeps running until its period ends,
 * with the cancellation held as a scheduled change on the Paddle side.
 * Clearing that change is all it takes to keep the plan: nothing is charged,
 * nothing restarts, the renewal date is the one it always was.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const { uid } = auth;

    const throttled = rateLimitGuard(request, "paddle-billing", uid);
    if (throttled) return throttled;

    const paddle = getPaddle();
    if (!paddle) {
        return NextResponse.json({ error: "billing-not-configured" }, { status: 503 });
    }

    const userRef = adminDb.doc(`users/${uid}`);
    const snap = await userRef.get();
    const billing = (snap.data()?.billing ?? {}) as Partial<StoredBilling>;

    if (!billing.paddleSubscriptionId) {
        return NextResponse.json({ error: "no-subscription" }, { status: 404 });
    }
    if (billing.scheduledChange?.action !== "cancel") {
        return NextResponse.json({ success: true, unchanged: true });
    }

    try {
        const updated = await paddle.subscriptions.update(billing.paddleSubscriptionId, {
            scheduledChange: null,
        });
        await userRef.set(
            {
                billing: {
                    subscriptionStatus: updated.status,
                    nextBilledAt: updated.nextBilledAt ?? null,
                    scheduledChange: updated.scheduledChange
                        ? { action: updated.scheduledChange.action, effectiveAt: updated.scheduledChange.effectiveAt }
                        : null,
                },
            },
            { merge: true },
        );
        return NextResponse.json({ success: true, status: updated.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[paddle/resume] update failed:", message);
        return NextResponse.json({ error: "resume-failed" }, { status: 502 });
    }
}
