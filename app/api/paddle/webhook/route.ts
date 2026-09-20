import { NextResponse } from "next/server";
import { EventName } from "@paddle/paddle-node-sdk";
import { getPaddle } from "@/lib/paddle/server";
import { syncSubscription, type SubscriptionLike } from "@/lib/paddle/sync";

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

// Finding the user and writing the subscription live in lib/paddle/sync.ts,
// shared with the admin console's "Refresh from Paddle" so both write the
// same shape.

export async function POST(request: Request) {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    const paddle = getPaddle();

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
