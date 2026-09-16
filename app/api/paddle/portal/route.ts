import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { getPaddle, type StoredBilling } from "@/lib/paddle/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens Paddle's customer portal for the caller.
 *
 * The portal is Paddle's own hosted page where a customer changes card,
 * cancels, downloads invoices and updates their billing address. It is
 * reached through a short-lived session URL minted here, on the server, for
 * the customer id stored on the caller's user doc; the browser never learns
 * a customer id it could try on someone else. "Manage subscription" in
 * Settings is the one caller.
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

    const snap = await adminDb.doc(`users/${uid}`).get();
    const billing = (snap.data()?.billing ?? {}) as Partial<StoredBilling>;

    if (!billing.paddleCustomerId) {
        return NextResponse.json({ error: "no-subscription" }, { status: 404 });
    }

    try {
        const session = await paddle.customerPortalSessions.create(
            billing.paddleCustomerId,
            billing.paddleSubscriptionId ? [billing.paddleSubscriptionId] : [],
        );
        const forSubscription = session.urls.subscriptions.find((s) => s.id === billing.paddleSubscriptionId)
            ?? session.urls.subscriptions[0];

        return NextResponse.json({
            url: session.urls.general.overview,
            cancelUrl: forSubscription?.cancelSubscription ?? null,
            updatePaymentUrl: forSubscription?.updateSubscriptionPaymentMethod ?? null,
        });
    } catch (error: unknown) {
        console.error("[paddle/portal] session failed:", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "portal-failed" }, { status: 502 });
    }
}
