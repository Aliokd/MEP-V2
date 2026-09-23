import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { planFromPriceId, isEntitled } from "./config";
import { getPaddle } from "./server";
import { syncMembership } from "@/lib/membership";

/**
 * The one place a Paddle subscription is written onto a user document.
 *
 * The webhook calls it for every subscription event; the admin console calls
 * it through `syncFromPaddle` when someone presses "Refresh from Paddle" or
 * after it has changed the subscription itself. Both paths write the same
 * shape, so the console can never show a subscription the platform reads
 * differently.
 */

/** The subset of Paddle's subscription we persist, as the SDK and the webhook both deliver it. */
export interface SubscriptionLike {
    id: string;
    status: string;
    customerId: string;
    customData: unknown;
    currentBillingPeriod: { startsAt: string; endsAt: string } | null;
    /** When the card is next charged; null once cancelled. */
    nextBilledAt: string | null;
    /** A cancellation, pause or resume that Paddle will apply later. */
    scheduledChange: { action: string; effectiveAt: string } | null;
    items: Array<{
        price: { id: string } | null;
        trialDates: { startsAt: string; endsAt: string } | null;
    }>;
}

/**
 * Maps a Paddle subscription onto a Firebase uid.
 *
 * Checkout sends `customData.uid`, but renewals and cancellations that Paddle
 * raises on its own don't carry it; those fall back to the customer id we
 * stored the first time round.
 */
export async function resolveUid(sub: SubscriptionLike): Promise<string | null> {
    const custom = sub.customData as { uid?: unknown } | null;
    if (custom && typeof custom.uid === "string" && custom.uid) {
        // `customData.uid` is set by the browser that opened the checkout,
        // with the public client token, so it is a claim and not a fact.
        // It is honoured only for an account that has no Paddle customer
        // yet, or whose customer is the one on this subscription: a checkout
        // opened with someone else's uid must not rewrite their plan.
        const claimed = await adminDb.doc(`users/${custom.uid}`).get();
        if (!claimed.exists) {
            console.warn(`Paddle sync: customData.uid ${custom.uid} has no user doc; ignoring the claim`);
        } else {
            const owned = claimed.data()?.billing?.paddleCustomerId;
            if (!owned || owned === sub.customerId) return custom.uid;
            console.warn(`Paddle sync: subscription ${sub.id} (customer ${sub.customerId}) claims uid ${custom.uid}, which belongs to customer ${owned}; ignoring the claim`);
        }
    }

    if (!sub.customerId) return null;

    const snap = await adminDb
        .collection("users")
        .where("billing.paddleCustomerId", "==", sub.customerId)
        .limit(1)
        .get();

    return snap.empty ? null : snap.docs[0].id;
}

/**
 * Writes one subscription onto users/{uid}.
 *
 * `occurredAt` orders deliveries: Paddle retries and can deliver out of
 * order, so an event older than the last one written is dropped. A read
 * straight from the API (the console's refresh) passes `null` and always
 * wins, because it is the current state by definition.
 */
export async function writeSubscription(uid: string, sub: SubscriptionLike, occurredAt: string | null): Promise<string> {
    const userRef = adminDb.doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        console.warn(`Paddle sync: users/${uid} does not exist`);
        return "user doc missing";
    }

    const lastEventAt = userSnap.data()?.billing?.lastEventAt;
    if (occurredAt && typeof lastEventAt === "string" && lastEventAt > occurredAt) {
        return "stale event ignored";
    }

    const item = sub.items?.[0];
    const priceId = item?.price?.id ?? null;
    const matched = priceId ? planFromPriceId(priceId) : null;
    const entitled = isEntitled(sub.status);

    if (priceId && !matched) {
        console.warn(`Paddle sync: price ${priceId} does not map to a known plan. Check NEXT_PUBLIC_PADDLE_PRICE_* vars`);
    }

    // The tier follows the subscription: the plan while it is entitled,
    // "free" once it has lapsed. A lifetime grant ("comp") is the one thing
    // a subscription must not overwrite: a golden ticket outlives any card.
    const currentTier = userSnap.data()?.tier;
    const nextTier = currentTier === "comp" ? "comp" : entitled && matched ? matched.plan : "free";

    await userRef.set(
        {
            tier: nextTier,
            billing: {
                plan: matched?.plan ?? null,
                billingPeriod: matched?.period ?? null,
                paddleCustomerId: sub.customerId,
                paddleSubscriptionId: sub.id,
                subscriptionStatus: sub.status,
                currentPeriodEnd: sub.currentBillingPeriod?.endsAt ?? null,
                nextBilledAt: sub.nextBilledAt ?? null,
                trialEndsAt: item?.trialDates?.endsAt ?? null,
                // "Cancels on the 3rd" is the one thing Settings has to be
                // able to say that the status alone does not: a cancelled
                // subscription stays `active` until the period ends.
                scheduledChange: sub.scheduledChange
                    ? { action: sub.scheduledChange.action, effectiveAt: sub.scheduledChange.effectiveAt }
                    : null,
                lastEventAt: occurredAt ?? new Date().toISOString(),
                lastSyncedAt: new Date().toISOString(),
            },
        },
        { merge: true },
    );
    await syncMembership(uid);

    return `synced ${uid}`;
}

/** The webhook path: find the user, then write. */
export async function syncSubscription(sub: SubscriptionLike, occurredAt: string): Promise<string> {
    const uid = await resolveUid(sub);
    if (!uid) {
        // Not an error: it can legitimately happen for customers created
        // outside this app. Logged so it's visible rather than silently lost.
        console.warn(`Paddle sync: no user matched subscription ${sub.id} (customer ${sub.customerId})`);
        return "no matching user";
    }
    return writeSubscription(uid, sub, occurredAt);
}

/**
 * The console path: read the subscription back from Paddle and write it.
 * Returns what Paddle holds, so the caller can show it whether or not the
 * doc needed changing. Null when the account has no subscription id.
 */
export async function syncFromPaddle(uid: string): Promise<SubscriptionLike | null> {
    const paddle = getPaddle();
    if (!paddle) throw new Error("billing-not-configured");

    const snap = await adminDb.doc(`users/${uid}`).get();
    const subscriptionId = snap.data()?.billing?.paddleSubscriptionId;
    if (typeof subscriptionId !== "string" || !subscriptionId) return null;

    const sub = (await paddle.subscriptions.get(subscriptionId)) as unknown as SubscriptionLike;
    await writeSubscription(uid, sub, null);
    return sub;
}
