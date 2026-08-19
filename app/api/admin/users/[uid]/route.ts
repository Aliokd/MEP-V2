import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { roleHasPermission } from "@/lib/admin/roles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

const DAY = 24 * 60 * 60 * 1000;
const VALID_TIERS = ["trial", "pro", "max", "comp"];

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
        },
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
        if (!VALID_TIERS.includes(body.tier)) {
            return NextResponse.json({ error: `Invalid tier "${body.tier}"` }, { status: 400 });
        }
        update.tier = body.tier;
        before.tier = current.tier;
        after.tier = body.tier;
        actions.push("tier");
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

    if (actions.length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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

    return NextResponse.json({ success: true });
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

    const posts = await adminDb.collection("connect_posts").where("authorId", "==", uid).get();
    const batch = adminDb.batch();
    posts.docs.forEach((doc) => {
        batch.update(doc.ref, {
            authorId: null,
            author: "Deleted account",
            avatarFallback: "—",
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
        after: { postsAnonymized: posts.size },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, postsAnonymized: posts.size });
});
