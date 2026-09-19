import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { getPaddle, type StoredBilling } from "@/lib/paddle/server";
import { isEntitled } from "@/lib/paddle/config";
import { sanitizeOffboardingInput, type OffboardingRecord } from "@/lib/offboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancels the caller's subscription at the end of the period already paid
 * for. Nothing is taken away today: a trial runs to its end without a charge,
 * a paid month runs to its renewal date, and the webhook flips the tier when
 * Paddle applies the change. Until then Settings says "Ends {date}" and
 * offers to keep the plan instead (/api/paddle/resume).
 *
 * The reasons given on the way out are kept in `offboarding`, beside the
 * account deletions, so the console can see why people go.
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

    let body: Record<string, unknown> = {};
    try {
        const parsed: unknown = await request.json();
        if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
        // An empty body is a cancellation with nothing said about it.
    }
    const { reasons, note } = sanitizeOffboardingInput(body);

    const userRef = adminDb.doc(`users/${uid}`);
    const snap = await userRef.get();
    const data = snap.data() ?? {};
    const billing = (data.billing ?? {}) as Partial<StoredBilling>;

    if (!billing.paddleSubscriptionId || !isEntitled(billing.subscriptionStatus)) {
        return NextResponse.json({ error: "no-subscription" }, { status: 404 });
    }
    if (billing.scheduledChange?.action === "cancel") {
        return NextResponse.json({ success: true, unchanged: true, effectiveAt: billing.scheduledChange.effectiveAt });
    }

    let effectiveAt: string | null = null;
    try {
        const updated = await paddle.subscriptions.cancel(billing.paddleSubscriptionId, {
            effectiveFrom: "next_billing_period",
        });
        effectiveAt = updated.scheduledChange?.effectiveAt ?? updated.currentBillingPeriod?.endsAt ?? null;
        // Written here as well as by the webhook, so the page that asked sees
        // the answer at once. Only the fields the change touches; the event
        // stamp stays the webhook's, so its own delivery is not read as stale.
        await userRef.set(
            {
                billing: {
                    subscriptionStatus: updated.status,
                    nextBilledAt: updated.nextBilledAt ?? null,
                    scheduledChange: updated.scheduledChange
                        ? { action: updated.scheduledChange.action, effectiveAt: updated.scheduledChange.effectiveAt }
                        : effectiveAt
                          ? { action: "cancel", effectiveAt }
                          : null,
                },
            },
            { merge: true },
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[paddle/cancel] cancel failed:", message);
        return NextResponse.json({ error: "cancel-failed" }, { status: 502 });
    }

    const createdAt = Date.parse(typeof data.createdAt === "string" ? data.createdAt : "");
    const record: OffboardingRecord = {
        kind: "cancel",
        uid,
        email: typeof data.email === "string" ? data.email : null,
        name: typeof data.name === "string" ? data.name : null,
        locale: typeof data.locale === "string" ? data.locale : null,
        tier: typeof data.tier === "string" ? data.tier : null,
        plan: billing.plan ?? null,
        subscriptionStatus: billing.subscriptionStatus ?? null,
        accountAgeDays: Number.isNaN(createdAt) ? null : Math.floor((Date.now() - createdAt) / 86_400_000),
        songs: 0,
        reasons,
        note,
        subscriptionCancelled: true,
        createdAt: new Date().toISOString(),
    };
    // The record is the feedback, not the cancellation: a failure to keep it
    // must not turn a cancellation that went through into an error.
    await adminDb.collection("offboarding").add(record).catch((err) => {
        console.error("[paddle/cancel] could not keep the offboarding record:", err);
    });

    return NextResponse.json({ success: true, effectiveAt });
}
