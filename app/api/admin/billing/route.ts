import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Subscription overview, derived from the `billing` object on each user doc that
 * the Paddle integration writes.
 *
 * This reports what Veinote's own database believes. It is not a reconciliation
 * against Paddle — if the webhook has been failing, this will be confidently
 * wrong, so the response carries the counts needed to notice that.
 */
export const GET = withAdmin("billing.read", async () => {
    const snap = await adminDb.collection("users").get();

    const now = Date.now();
    let comp = 0;
    let expired = 0;
    let trial = 0;
    let pro = 0;
    let max = 0;
    let none = 0;
    let trialsExpiring7d = 0;
    let trialsLapsed = 0;
    let missingPaddleId = 0;
    // Cancelled from Settings but still running out their period: paying
    // today, gone at the next renewal. The one leading indicator in here.
    let scheduledCancellations = 0;
    const statuses: Record<string, number> = {};

    const attention: {
        uid: string; email: string | null; tier: string | null;
        status: string | null; trialEndsAt: string | null; issue: string;
    }[] = [];

    snap.docs.forEach((doc) => {
        const d = doc.data();
        const billing = d.billing || {};
        const tier = d.tier || "none";

        if (tier === "trial") trial += 1;
        else if (tier === "pro") pro += 1;
        else if (tier === "max") max += 1;
        else if (tier === "comp") comp += 1;
        else if (tier === "free") expired += 1;
        else none += 1;

        if (billing.subscriptionStatus) {
            statuses[billing.subscriptionStatus] = (statuses[billing.subscriptionStatus] || 0) + 1;
        }
        if (billing.scheduledChange?.action === "cancel") scheduledCancellations += 1;

        const trialEnd = Date.parse(billing.trialEndsAt || "");
        if (!Number.isNaN(trialEnd)) {
            if (trialEnd >= now && trialEnd <= now + 7 * DAY) trialsExpiring7d += 1;
            if (trialEnd < now && tier === "trial") {
                trialsLapsed += 1;
                attention.push({
                    uid: doc.id,
                    email: d.email || null,
                    tier,
                    status: billing.subscriptionStatus || null,
                    trialEndsAt: billing.trialEndsAt,
                    issue: "Trial lapsed but tier is still trial",
                });
            }
        }

        // A plan tier with no Paddle customer is a grant, not a payment: fine,
        // but worth seeing, since it is access nobody is paying for.
        if ((tier === "pro" || tier === "max") && !billing.paddleCustomerId) {
            missingPaddleId += 1;
            attention.push({
                uid: doc.id,
                email: d.email || null,
                tier,
                status: billing.subscriptionStatus || null,
                trialEndsAt: billing.trialEndsAt || null,
                issue: "Granted plan with no Paddle subscription",
            });
        }
        // The webhook and the tier disagree: a live subscription on a tier
        // that is not its plan. A missed delivery, usually; "Refresh from
        // Paddle" on the account repairs it.
        if (billing.paddleSubscriptionId && ["active", "trialing", "past_due"].includes(billing.subscriptionStatus) && billing.plan && tier !== billing.plan && tier !== "comp") {
            attention.push({
                uid: doc.id,
                email: d.email || null,
                tier,
                status: billing.subscriptionStatus || null,
                trialEndsAt: billing.trialEndsAt || null,
                issue: `Paddle says ${billing.plan} but the tier is ${tier}`,
            });
        }

        if (["past_due", "paused", "canceled"].includes(billing.subscriptionStatus)) {
            attention.push({
                uid: doc.id,
                email: d.email || null,
                tier,
                status: billing.subscriptionStatus,
                trialEndsAt: billing.trialEndsAt || null,
                issue: `Subscription is ${billing.subscriptionStatus}`,
            });
        }
    });

    // Paying means a live Paddle subscription, not a tier: grants are access
    // without a card, and the conversion rate must not count them.
    const paying = (statuses.active || 0) + (statuses.trialing || 0) + (statuses.past_due || 0);
    const conversion = trial + expired + paying > 0 ? paying / (trial + expired + paying) : 0;

    return NextResponse.json({
        tiers: { trial, pro, max, comp, expired, none },
        statuses,
        paying,
        conversionRate: Math.round(conversion * 1000) / 10,
        trialsExpiring7d,
        trialsLapsed,
        missingPaddleId,
        scheduledCancellations,
        attention: attention.slice(0, 100),
        note: "Derived from the billing object on each user document, not reconciled against Paddle.",
    });
});
