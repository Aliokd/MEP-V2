import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { getPaddle } from "@/lib/paddle/server";
import { syncFromPaddle } from "@/lib/paddle/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

/**
 * The console's hand on a user's Paddle subscription.
 *
 *   sync    Read the subscription back from Paddle and write it onto the
 *           user document, the same way the webhook does. The answer to
 *           "is what I am looking at true?", and the repair when a webhook
 *           delivery was missed.
 *   cancel  Cancel it, at the end of the paid period or now. Written back
 *           at once through sync, so the console shows the result without
 *           waiting for Paddle's notification.
 *
 * Both need the API key; without it the route says so rather than pretending.
 */
export const POST = withAdmin("users.write", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    const paddle = getPaddle();
    if (!paddle) {
        return NextResponse.json({ error: "Paddle is not configured on this server (PADDLE_API_KEY)" }, { status: 503 });
    }

    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const current = snap.data() || {};
    const subscriptionId = current.billing?.paddleSubscriptionId;

    if (action === "sync") {
        if (!subscriptionId) {
            return NextResponse.json({ error: "This account has no Paddle subscription to read" }, { status: 400 });
        }
        try {
            const sub = await syncFromPaddle(uid);
            const after = (await ref.get()).data()?.billing ?? null;
            return NextResponse.json({ success: true, status: sub?.status ?? null, billing: after });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return NextResponse.json({ error: `Paddle refused the read: ${message}` }, { status: 502 });
        }
    }

    if (action === "cancel") {
        if (!subscriptionId) {
            return NextResponse.json({ error: "This account has no Paddle subscription to cancel" }, { status: 400 });
        }
        const when = body?.when === "immediately" ? "immediately" : "next_billing_period";
        try {
            await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: when });
            const sub = await syncFromPaddle(uid);
            await writeAudit({
                actorUid: admin.uid,
                actorEmail: admin.email,
                actorRole: admin.role,
                action: "user.billing.cancel",
                targetType: "user",
                targetId: uid,
                targetLabel: current.email || uid,
                reason: body?.reason || undefined,
                before: { status: current.billing?.subscriptionStatus ?? null },
                after: { status: sub?.status ?? null, when },
                ...auditContext(request),
            });
            const after = (await ref.get()).data()?.billing ?? null;
            return NextResponse.json({ success: true, status: sub?.status ?? null, billing: after });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return NextResponse.json({ error: `Paddle refused the cancellation: ${message}` }, { status: 502 });
        }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
