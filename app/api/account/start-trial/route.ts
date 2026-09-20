import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { defaultTrialEnd } from "@/lib/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stamps the trial's end date on an account that has none.
 *
 * The onboarding email step writes the date when it makes the account, but
 * an account made in the browser (Google sign-in) cannot: the rules keep
 * `billing.trialEndsAt` out of a client's hands, since it is the one field
 * the platform gates on. So the plan hook asks here, once, and the trial
 * starts from the first time the account is read, which for a new account
 * is the moment it is made.
 *
 * Idempotent and narrow: it only ever writes a null date on a trial-tier
 * account with no Paddle subscription. A date that exists, whoever set it,
 * is never moved from here; the console moves dates.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const { uid } = auth;

    const throttled = rateLimitGuard(request, "account-start-trial", uid);
    if (throttled) return throttled;

    const ref = adminDb.doc(`users/${uid}`);
    const result = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return { stamped: false, reason: "no-profile" };
        const data = snap.data() ?? {};
        const billing = data.billing ?? {};
        const tier = data.tier ?? "trial";
        if (tier !== "trial") return { stamped: false, reason: "not-trial" };
        if (billing.paddleSubscriptionId) return { stamped: false, reason: "has-subscription" };
        if (typeof billing.trialEndsAt === "string" && billing.trialEndsAt) {
            return { stamped: false, reason: "already-set", trialEndsAt: billing.trialEndsAt };
        }
        const trialEndsAt = defaultTrialEnd();
        tx.set(ref, { billing: { trialEndsAt } }, { merge: true });
        return { stamped: true, trialEndsAt };
    });

    return NextResponse.json(result);
}
