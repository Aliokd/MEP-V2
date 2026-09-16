import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { getPaddle, type StoredBilling } from "@/lib/paddle/server";
import { getPriceId, isEntitled, BILLING_PERIODS, PLAN_IDS, type BillingPeriod, type PlanId } from "@/lib/paddle/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Moves an existing subscription to another plan or billing period.
 *
 * A subscriber who presses "Go Max" must not be sent through checkout again:
 * that would open a second subscription beside the first and charge for
 * both. The subscription is updated in place instead, and the webhook writes
 * the new plan to the user doc the same way it wrote the first.
 *
 * Proration follows the subscription's state. An active subscription is
 * charged the difference today, so the upgrade is real the moment it is
 * pressed. A trialing one is not charged at all: the trial carries on, on the
 * new plan, and the first bill at its end is for that plan. Nobody should be
 * charged mid-trial for changing their mind about which trial to have.
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

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return NextResponse.json({ error: "invalid-body" }, { status: 400 });
    }

    const plan = body.plan as PlanId;
    const period = body.billing as BillingPeriod;
    if (!PLAN_IDS.includes(plan) || !BILLING_PERIODS.includes(period)) {
        return NextResponse.json({ error: "invalid-plan" }, { status: 400 });
    }
    const priceId = getPriceId(plan, period);
    if (!priceId) {
        return NextResponse.json({ error: "plan-not-available" }, { status: 400 });
    }

    const snap = await adminDb.doc(`users/${uid}`).get();
    const billing = (snap.data()?.billing ?? {}) as Partial<StoredBilling>;

    if (!billing.paddleSubscriptionId || !isEntitled(billing.subscriptionStatus)) {
        // Nothing to change: the caller should go through checkout.
        return NextResponse.json({ error: "no-subscription" }, { status: 404 });
    }
    if (billing.plan === plan && billing.billingPeriod === period) {
        return NextResponse.json({ success: true, unchanged: true });
    }

    try {
        const updated = await paddle.subscriptions.update(billing.paddleSubscriptionId, {
            items: [{ priceId, quantity: 1 }],
            prorationBillingMode: billing.subscriptionStatus === "trialing" ? "do_not_bill" : "prorated_immediately",
        });
        return NextResponse.json({ success: true, status: updated.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[paddle/change-plan] update failed:", message);
        return NextResponse.json({ error: "change-failed", detail: message }, { status: 502 });
    }
}
