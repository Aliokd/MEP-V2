import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

const DAY = 24 * 60 * 60 * 1000;

/** Escalating ladder. `warn` leaves a record; `ban` is indefinite. */
const SANCTION_TYPES = ["warn", "mute", "suspend", "ban"] as const;
type SanctionType = (typeof SANCTION_TYPES)[number];

const SANCTION_COPY: Record<SanctionType, { subject: string; lead: string }> = {
    warn: {
        subject: "A note about your Veinote account",
        lead: "We're writing about something posted from your Veinote account that doesn't fit our community guidelines. No restrictions have been applied. This is a heads-up.",
    },
    mute: {
        subject: "Your posting access on Veinote is paused",
        lead: "Posting and commenting on Connect have been paused on your Veinote account. You can still write, record and keep your songs. This only affects the community feed.",
    },
    suspend: {
        subject: "Your Veinote account has been suspended",
        lead: "Your Veinote account has been suspended. You can't sign in while the suspension is in place. Your songs are untouched and will be there when it lifts.",
    },
    ban: {
        subject: "Your Veinote account has been closed",
        lead: "Your Veinote account has been closed for breaching our community guidelines. You can't sign in.",
    },
};

/**
 * Applies a sanction and tells the person why.
 *
 * Three things happen together on purpose: the sanction record (what moderators
 * see), the flag on the user doc (what the app enforces), and the email stating
 * the reason and how to appeal. A sanction nobody explained isn't moderation,
 * it's just a broken account.
 */
export const POST = withAdmin("users.sanction", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    const { type, reason, days, notify = true, relatedReportId } = await request.json();

    if (!SANCTION_TYPES.includes(type)) {
        return NextResponse.json({ error: `Invalid sanction type "${type}"` }, { status: 400 });
    }
    if (!reason || !String(reason).trim()) {
        return NextResponse.json({ error: "A reason is required. It is sent to the user" }, { status: 400 });
    }
    if (uid === admin.uid) {
        return NextResponse.json({ error: "You cannot sanction yourself" }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = userSnap.data() || {};

    // A moderator must not be able to sanction another admin — that's a
    // superadmin decision, made by revoking the role first.
    const targetAdmin = await adminDb.collection("admins").doc(uid).get();
    if (targetAdmin.exists && admin.role !== "superadmin") {
        return NextResponse.json({ error: "Only a superadmin can sanction another admin" }, { status: 403 });
    }

    const durationDays = type === "mute" || type === "suspend" ? Number(days) || 7 : null;
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * DAY) : null;

    const sanction = await adminDb.collection("user_sanctions").add({
        userId: uid,
        userEmail: user.email || null,
        type,
        reason: String(reason).trim(),
        durationDays,
        expiresAt,
        active: type !== "warn",
        relatedReportId: relatedReportId || null,
        issuedByUid: admin.uid,
        issuedByEmail: admin.email,
        createdAt: FieldValue.serverTimestamp(),
        liftedAt: null,
        appealable: true,
    });

    if (type !== "warn") {
        await userRef.update({
            sanction: {
                active: true,
                type,
                reason: String(reason).trim(),
                sanctionId: sanction.id,
                expiresAt: expiresAt ? expiresAt.toISOString() : null,
                // The same instant as a number, because firestore.rules enforces
                // the mute and cannot parse the ISO string. Without this the rule
                // has no way to tell a live mute from an expired one.
                expiresAtMillis: expiresAt ? expiresAt.getTime() : null,
                issuedAtMillis: Date.now(),
            },
        });
    }

    // Suspension and ban cut off access at the Auth layer, not just in the UI.
    if (type === "suspend" || type === "ban") {
        await adminAuth.updateUser(uid, { disabled: true }).catch((err) =>
            console.error("[sanction] Failed to disable auth account:", err),
        );
        await adminAuth.revokeRefreshTokens(uid).catch(() => {});
    }

    let notified = false;
    if (notify && user.email) {
        const copy = SANCTION_COPY[type as SanctionType];
        const untilLine = expiresAt
            ? `\nThis lasts until ${expiresAt.toUTCString()}.`
            : type === "ban"
              ? "\nThis is permanent."
              : "";

        try {
            await sendMail({
                to: user.email,
                subject: copy.subject,
                text: `${copy.lead}
${untilLine}

Reason given by our moderation team:
------------------------------------------
${String(reason).trim()}
------------------------------------------

If you think this is wrong, reply to this email and a person will review it. Appeals are read by someone other than the moderator who made the decision.

Veinote`,
            });
            notified = true;
        } catch (err) {
            console.error("[sanction] Failed to notify user:", err);
        }
    }

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `user.${type}`,
        targetType: "user",
        targetId: uid,
        targetLabel: user.email || uid,
        reason: String(reason).trim(),
        after: { sanctionId: sanction.id, durationDays, notified },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, sanctionId: sanction.id, notified });
});

/** Lifts the active sanction — used when an appeal succeeds or a mistake is found. */
export const DELETE = withAdmin("users.sanction", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    const url = new URL(request.url);
    const reason = url.searchParams.get("reason") || "";

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = userSnap.data() || {};

    const active = await adminDb
        .collection("user_sanctions")
        .where("userId", "==", uid)
        .where("active", "==", true)
        .get();

    const batch = adminDb.batch();
    active.docs.forEach((doc) =>
        batch.update(doc.ref, {
            active: false,
            liftedAt: FieldValue.serverTimestamp(),
            liftedByUid: admin.uid,
            liftedByEmail: admin.email,
            liftReason: reason,
        }),
    );
    batch.update(userRef, { sanction: FieldValue.delete() });
    await batch.commit();

    await adminAuth.updateUser(uid, { disabled: false }).catch(() => {});

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "user.sanction.lift",
        targetType: "user",
        targetId: uid,
        targetLabel: user.email || uid,
        reason,
        after: { lifted: active.size },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, lifted: active.size });
});
