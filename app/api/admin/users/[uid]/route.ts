import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { roleHasPermission } from "@/lib/admin/roles";
import { ASSIGNABLE_TIERS } from "@/lib/admin/tiers";
import { isEntitled, getPriceId, type PlanId } from "@/lib/paddle/config";
import { getPaddle } from "@/lib/paddle/server";
import { syncFromPaddle } from "@/lib/paddle/sync";
import { resolveEntitlement } from "@/lib/entitlement";
import { syncMembership } from "@/lib/membership";
import { issueTicketForUser, releaseTicketForUser } from "@/lib/goldenGrants";
import { COLLECTION as GOLDEN_COLLECTION, getTicket, shapeTicket } from "@/lib/goldenTickets";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

const DAY = 24 * 60 * 60 * 1000;

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === "number") return value;
    return null;
}

async function safeCount(query: FirebaseFirestore.Query): Promise<number> {
    try {
        return (await query.count().get()).data().count;
    } catch {
        return 0;
    }
}

export const GET = withAdmin("users.read", async (_request, _admin, ctx: Ctx) => {
    const { uid } = await ctx.params;

    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const d = snap.data() || {};

    // The Auth record carries things the profile doc doesn't: sign-in providers,
    // whether the account is disabled, and the real last sign-in time.
    const authRecord = await adminAuth
        .getUser(uid)
        .then((u) => ({
            disabled: u.disabled,
            emailVerified: u.emailVerified,
            providers: u.providerData.map((p) => p.providerId),
            lastSignInAt: u.metadata.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : null,
            createdAt: u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : null,
        }))
        .catch(() => null);

    const [projects, posts, reportsAgainst, reportsFiled, feedbackCount, supportCount, sanctionsSnap, adminSnap] =
        await Promise.all([
            safeCount(adminDb.collection("projects").where("ownerId", "==", uid)),
            safeCount(adminDb.collection("connect_posts").where("authorId", "==", uid)),
            safeCount(adminDb.collection("reports").where("targetOwnerId", "==", uid)),
            safeCount(adminDb.collection("reports").where("reporterId", "==", uid)),
            safeCount(adminDb.collection("user_feedback").where("userId", "==", uid)),
            safeCount(adminDb.collection("support_tickets").where("userId", "==", uid)),
            adminDb.collection("user_sanctions").where("userId", "==", uid).orderBy("createdAt", "desc").limit(20).get()
                .catch(() => null),
            adminDb.collection("admins").doc(uid).get(),
        ]);

    // The golden ticket behind a lifetime grant, read so the drawer can name
    // it rather than print a slug: its number, whether it is on the wall, and
    // the page to send the person.
    const goldenSlug = typeof d.golden?.ticket === "string" ? d.golden.ticket : null;
    const goldenTicket = goldenSlug ? await getTicket(goldenSlug).catch(() => null) : null;

    return NextResponse.json({
        user: {
            uid,
            name: d.name || null,
            email: d.email || null,
            tier: d.tier || null,
            // Written by /api/admin/users/create and, until now, read by nothing:
            // the console could not tell an account it made itself from one that
            // signed itself up, which is the first question asked of a new row.
            createdByAdmin: d.createdByAdmin || null,
            locale: d.locale || null,
            answers: d.answers || {},
            createdAt: toMillis(d.createdAt),
            lastActiveAt: toMillis(d.lastActiveAt),
            billing: d.billing || null,
            sanction: d.sanction || null,
            // How they got here: the onboarding source and, for an ad click,
            // the campaign it came from.
            signup: d.signup || null,
            golden: d.golden
                ? {
                      ...d.golden,
                      number: goldenTicket?.number ?? null,
                      status: goldenTicket?.status ?? null,
                      listed: goldenTicket?.listed ?? null,
                      code: goldenTicket?.code ?? null,
                      origin: goldenTicket?.origin ?? null,
                      pagePath: goldenSlug ? `/golden/${goldenSlug}` : null,
                  }
                : null,
        },
        // What the platform itself concludes from the fields above, so the
        // console never has to re-derive the gate and get it slightly wrong.
        entitlement: resolveEntitlement({
            tier: d.tier ?? null,
            plan: d.billing?.plan ?? null,
            subscriptionStatus: d.billing?.subscriptionStatus ?? null,
            trialEndsAt: d.billing?.trialEndsAt ?? null,
            createdAt: d.createdAt ?? null,
        }),
        auth: authRecord,
        adminRole: adminSnap.exists ? adminSnap.data()?.role || null : null,
        stats: { projects, posts, reportsAgainst, reportsFiled, feedbackCount, supportCount },
        sanctions:
            sanctionsSnap?.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: toMillis(doc.data().createdAt),
                expiresAt: toMillis(doc.data().expiresAt),
            })) || [],
    });
});

export const PATCH = withAdmin("users.write", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    const body = await request.json();

    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const current = snap.data() || {};

    const update: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const actions: string[] = [];

    if (body.tier !== undefined) {
        if (!ASSIGNABLE_TIERS.includes(body.tier)) {
            return NextResponse.json({ error: `Invalid tier "${body.tier}"` }, { status: 400 });
        }
        const billing = current.billing || {};
        const hasLiveSub = Boolean(billing.paddleSubscriptionId) && isEntitled(billing.subscriptionStatus);

        // Paddle is the truth for a paying account, so a plan change on one
        // is made in Paddle and read back, never written over locally: a
        // local grant the next webhook would undo is worse than a refusal.
        if (hasLiveSub && (body.tier === "pro" || body.tier === "max")) {
            const paddle = getPaddle();
            if (!paddle) {
                return NextResponse.json({ error: "This account pays through Paddle and PADDLE_API_KEY is not set, so the plan cannot be changed from here" }, { status: 503 });
            }
            const period = billing.billingPeriod === "monthly" ? "monthly" : "yearly";
            const priceId = getPriceId(body.tier as PlanId, period);
            if (!priceId) {
                return NextResponse.json({ error: `No Paddle price is configured for that plan (${period})` }, { status: 400 });
            }
            if (billing.plan !== body.tier) {
                try {
                    await paddle.subscriptions.update(billing.paddleSubscriptionId, {
                        items: [{ priceId, quantity: 1 }],
                        prorationBillingMode: billing.subscriptionStatus === "trialing" ? "do_not_bill" : "prorated_immediately",
                    });
                    await syncFromPaddle(uid);
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    return NextResponse.json({ error: `Paddle refused the plan change: ${message}` }, { status: 502 });
                }
            }
            before.tier = current.tier;
            after.tier = body.tier;
            after.viaPaddle = true;
            actions.push("plan");
        } else if (hasLiveSub && body.tier === "trial") {
            // A trial cannot sit beside a live subscription: the next webhook
            // would put the plan straight back. Cancel in Paddle first (the
            // Subscription panel offers it), then the trial can be set.
            return NextResponse.json({ error: "This account has a live Paddle subscription. Cancel it first, then set the trial" }, { status: 409 });
        } else {
            update.tier = body.tier;
            before.tier = current.tier;
            after.tier = body.tier;
            actions.push("tier");
        }

        // A trial is only a trial with an end date. Setting the tier to
        // trial with a length stamps it from now; without one, a date that
        // exists is kept and a missing one gets the default the platform
        // would stamp itself.
        if (body.tier === "trial") {
            const days = Number(body.trialDays);
            const existing = Date.parse(billing.trialEndsAt || "");
            let next: string | null = null;
            if (Number.isFinite(days) && days > 0 && days <= 365) {
                next = new Date(Date.now() + days * DAY).toISOString();
            } else if (Number.isNaN(existing) || existing < Date.now()) {
                next = new Date(Date.now() + 3 * DAY).toISOString();
            }
            if (next) {
                update["billing.trialEndsAt"] = next;
                before.trialEndsAt = billing.trialEndsAt || null;
                after.trialEndsAt = next;
            }
        }
    }

    if (body.extendTrialDays !== undefined) {
        const days = Number(body.extendTrialDays);
        if (!Number.isFinite(days) || days <= 0 || days > 365) {
            return NextResponse.json({ error: "extendTrialDays must be between 1 and 365" }, { status: 400 });
        }
        // Extend from whichever is later: the existing end date or now. Extending a
        // trial that already lapsed should give the user the full extra window.
        const existing = Date.parse(current.billing?.trialEndsAt || "");
        const from = Number.isNaN(existing) ? Date.now() : Math.max(existing, Date.now());
        const next = new Date(from + days * DAY).toISOString();
        update["billing.trialEndsAt"] = next;
        before.trialEndsAt = current.billing?.trialEndsAt || null;
        after.trialEndsAt = next;
        actions.push("trial");
    }

    if (body.disabled !== undefined) {
        if (!roleHasPermission(admin.role, "users.sanction")) {
            return NextResponse.json({ error: "Your role cannot disable accounts" }, { status: 403 });
        }
        await adminAuth.updateUser(uid, { disabled: Boolean(body.disabled) });
        if (body.disabled) await adminAuth.revokeRefreshTokens(uid);
        before.disabled = !body.disabled;
        after.disabled = Boolean(body.disabled);
        actions.push("disabled");
    }

    if (Object.keys(update).length > 0) {
        await ref.update(update);
    }
    // Tier and trial both decide whether this person is listed in Connect.
    if (actions.some((a) => a === "tier" || a === "plan" || a === "trial")) {
        await syncMembership(uid);
    }

    if (actions.length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Lifetime access and a golden ticket are two halves of one thing
    // (lib/goldenGrants.ts). Granting the tier issues the ticket that stands
    // for it, so the person joins the hundred on the wall with their ticket
    // marked taken; taking the tier away takes the ticket back.
    //
    // Read back rather than inferred from the body: a plan change on a paying
    // account is written by Paddle's own sync, so what the document says now
    // is the only trustworthy answer. Best effort in both directions, because
    // the tier is the grant and a full wall must never fail one.
    let golden: { outcome: string; slug: string | null; number: number | null } | null = null;
    if (body.tier !== undefined) {
        const nextTier = (await ref.get()).data()?.tier ?? null;
        try {
            if (nextTier === "comp" && current.tier !== "comp") {
                const issued = await issueTicketForUser({
                    uid,
                    name: current.name || null,
                    email: current.email || null,
                    issuedBy: admin.uid,
                });
                golden = { outcome: issued.outcome, slug: issued.ticket?.slug ?? null, number: issued.ticket?.number ?? null };
            } else if (current.tier === "comp" && nextTier !== "comp") {
                const released = await releaseTicketForUser(uid, admin.uid);
                golden = released;
            }
        } catch (err) {
            console.error("[admin/users] golden ticket step failed:", err);
            golden = { outcome: "failed", slug: null, number: null };
        }
        if (golden) after.golden = golden;
    }

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `user.update.${actions.join("+")}`,
        targetType: "user",
        targetId: uid,
        targetLabel: current.email || uid,
        reason: body.reason || undefined,
        before,
        after,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, golden });
});

/**
 * GDPR erasure. Removes the Auth account and the profile doc, and detaches the
 * person's identity from content that must survive for other users (a shared
 * project a collaborator still relies on) rather than deleting that too.
 */
export const DELETE = withAdmin("users.delete", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    const url = new URL(request.url);
    const reason = url.searchParams.get("reason") || "";

    if (uid === admin.uid) {
        return NextResponse.json({ error: "You cannot delete your own account from here" }, { status: 400 });
    }

    const snap = await adminDb.collection("users").doc(uid).get();
    const email = snap.data()?.email || uid;

    // Their golden ticket goes with them. Deleting an account is an erasure,
    // so the ticket is removed rather than revoked: it carries their name and
    // address, and it would otherwise hold one of the hundred for somebody
    // who no longer exists. The number is free for the next person chosen,
    // and this audit entry is the record that it was ever theirs.
    const goldenSlug = typeof snap.data()?.golden?.ticket === "string" ? (snap.data()!.golden.ticket as string) : null;
    let goldenFreed: { slug: string; number: number } | null = null;
    try {
        const ticket = goldenSlug ? await getTicket(goldenSlug) : null;
        const fallback = ticket
            ? null
            : await adminDb.collection(GOLDEN_COLLECTION).where("redeemedBy.uid", "==", uid).limit(1).get();
        const doomed = ticket ?? (fallback && !fallback.empty ? shapeTicket(fallback.docs[0]) : null);
        if (doomed) {
            await adminDb.collection(GOLDEN_COLLECTION).doc(doomed.slug).delete();
            goldenFreed = { slug: doomed.slug, number: doomed.number };
        }
    } catch (err) {
        console.error("[admin/users] removing the deleted account's golden ticket failed:", err);
    }

    const posts = await adminDb.collection("connect_posts").where("authorId", "==", uid).get();
    const batch = adminDb.batch();
    posts.docs.forEach((doc) => {
        batch.update(doc.ref, {
            authorId: null,
            author: "Deleted account",
            avatarFallback: "–",
            anonymizedAt: FieldValue.serverTimestamp(),
        });
    });
    batch.delete(adminDb.collection("users").doc(uid));
    await batch.commit();

    await adminAuth.deleteUser(uid).catch((err) => {
        console.error("[admin] Auth deletion failed (profile already removed):", err);
    });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "user.delete",
        targetType: "user",
        targetId: uid,
        targetLabel: email,
        reason,
        after: { postsAnonymized: posts.size, goldenFreed },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, postsAnonymized: posts.size, goldenFreed });
});
