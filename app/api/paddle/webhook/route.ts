import { NextResponse } from "next/server";
import { Paddle, Environment, EventName } from "@paddle/paddle-node-sdk";
import { adminDb } from "@/lib/firebaseAdmin";
import { PADDLE_ENVIRONMENT, planFromPriceId, isEntitled } from "@/lib/paddle/config";

// Signature verification needs the untouched request body, so this route must
// run on Node (not edge) and must never be statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBSCRIPTION_EVENTS = new Set<string>([
    EventName.SubscriptionCreated,
    EventName.SubscriptionActivated,
    EventName.SubscriptionUpdated,
    EventName.SubscriptionTrialing,
    EventName.SubscriptionPastDue,
    EventName.SubscriptionPaused,
    EventName.SubscriptionResumed,
    EventName.SubscriptionCanceled,
]);

// The subset of Paddle's subscription notification we actually persist.
interface SubscriptionLike {
    id: string;
    status: string;
    customerId: string;
    customData: unknown;
    currentBillingPeriod: { startsAt: string; endsAt: string } | null;
    items: Array<{
        price: { id: string } | null;
        trialDates: { startsAt: string; endsAt: string } | null;
    }>;
}

function getPaddleClient(): Paddle | null {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) return null;

    return new Paddle(apiKey, {
        environment: PADDLE_ENVIRONMENT === "production" ? Environment.production : Environment.sandbox,
    });
}

/**
 * Maps a Paddle subscription onto a Firebase uid.
 *
 * Checkout sends `customData.uid`, but renewals and cancellations that Paddle
 * raises on its own don't carry it — those fall back to the customer id we
 * stored the first time round.
 */
async function resolveUid(sub: SubscriptionLike): Promise<string | null> {
    const custom = sub.customData as { uid?: unknown } | null;
    if (custom && typeof custom.uid === "string" && custom.uid) {
        return custom.uid;
    }

    if (!sub.customerId) return null;

    const snap = await adminDb
        .collection("users")
        .where("billing.paddleCustomerId", "==", sub.customerId)
        .limit(1)
        .get();

    return snap.empty ? null : snap.docs[0].id;
}

async function syncSubscription(sub: SubscriptionLike, occurredAt: string): Promise<string> {
    const uid = await resolveUid(sub);
    if (!uid) {
        // Not an error: it can legitimately happen for customers created
        // outside this app. Logged so it's visible rather than silently lost.
        console.warn(`Paddle webhook: no user matched subscription ${sub.id} (customer ${sub.customerId})`);
        return "no matching user";
    }

    const userRef = adminDb.doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        console.warn(`Paddle webhook: users/${uid} does not exist`);
        return "user doc missing";
    }

    // Paddle retries and can deliver out of order — never let an older event
    // overwrite the state a newer one already wrote.
    const lastEventAt = userSnap.data()?.billing?.lastEventAt;
    if (typeof lastEventAt === "string" && lastEventAt > occurredAt) {
        return "stale event ignored";
    }

    const item = sub.items?.[0];
    const priceId = item?.price?.id ?? null;
    const matched = priceId ? planFromPriceId(priceId) : null;
    const entitled = isEntitled(sub.status);

    if (priceId && !matched) {
        console.warn(`Paddle webhook: price ${priceId} does not map to a known plan. Check NEXT_PUBLIC_PADDLE_PRICE_* vars`);
    }

    await userRef.set(
        {
            tier: entitled && matched ? matched.plan : "free",
            billing: {
                plan: matched?.plan ?? null,
                billingPeriod: matched?.period ?? null,
                paddleCustomerId: sub.customerId,
                paddleSubscriptionId: sub.id,
                subscriptionStatus: sub.status,
                currentPeriodEnd: sub.currentBillingPeriod?.endsAt ?? null,
                trialEndsAt: item?.trialDates?.endsAt ?? null,
                lastEventAt: occurredAt,
            },
        },
        { merge: true },
    );

    return `synced ${uid}`;
}

export async function POST(request: Request) {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    const paddle = getPaddleClient();

    if (!paddle || !webhookSecret) {
        console.error("Paddle webhook hit but PADDLE_API_KEY / PADDLE_WEBHOOK_SECRET are not set.");
        return NextResponse.json({ error: "Paddle is not configured" }, { status: 500 });
    }

    const signature = request.headers.get("paddle-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing paddle-signature header" }, { status: 400 });
    }

    // Must be the raw string: parsing first would change the bytes the
    // signature was computed over.
    const rawBody = await request.text();

    let event;
    try {
        event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
    } catch (error) {
        console.error("Paddle webhook signature verification failed:", error);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!event) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    try {
        if (SUBSCRIPTION_EVENTS.has(event.eventType)) {
            const result = await syncSubscription(
                event.data as unknown as SubscriptionLike,
                event.occurredAt,
            );
            return NextResponse.json({ success: true, event: event.eventType, result });
        }

        // Acknowledge anything else so Paddle stops retrying it.
        return NextResponse.json({ success: true, event: event.eventType, result: "ignored" });
    } catch (error: any) {
        // A 500 tells Paddle to retry, which is what we want for a transient
        // Firestore failure.
        console.error(`Paddle webhook failed handling ${event.eventType}:`, error);
        return NextResponse.json({ error: error?.message || "Webhook handler failed" }, { status: 500 });
    }
}
