import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ targetKey: string }> };

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "number") return value;
    return null;
}

/** The individual reports behind one queue row, plus who filed them. */
export const GET = withAdmin("reports.read", async (_request, _admin, ctx: Ctx) => {
    const { targetKey } = await ctx.params;

    const [aggregate, reports] = await Promise.all([
        adminDb.collection("report_targets").doc(targetKey).get(),
        adminDb.collection("reports").where("targetKey", "==", targetKey).orderBy("createdAt", "desc").get(),
    ]);

    if (!aggregate.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = aggregate.data() || {};

    // Context on the owner: someone with prior sanctions is a different case
    // from a first-time report, and the decision should reflect that.
    let owner: Record<string, unknown> | null = null;
    if (d.targetOwnerId) {
        const [userSnap, priorSanctions, priorReports] = await Promise.all([
            adminDb.collection("users").doc(d.targetOwnerId).get(),
            adminDb.collection("user_sanctions").where("userId", "==", d.targetOwnerId).count().get().catch(() => null),
            adminDb.collection("reports").where("targetOwnerId", "==", d.targetOwnerId).count().get().catch(() => null),
        ]);
        if (userSnap.exists) {
            const u = userSnap.data() || {};
            owner = {
                uid: d.targetOwnerId,
                name: u.name || null,
                email: u.email || null,
                tier: u.tier || null,
                createdAt: u.createdAt || null,
                sanctionActive: Boolean(u.sanction?.active),
                priorSanctions: priorSanctions?.data().count ?? 0,
                totalReportsAgainst: priorReports?.data().count ?? 0,
            };
        }
    }

    return NextResponse.json({
        target: {
            id: aggregate.id,
            ...d,
            firstReportedAt: toMillis(d.firstReportedAt),
            lastReportedAt: toMillis(d.lastReportedAt),
            handledAt: toMillis(d.handledAt),
        },
        owner,
        reports: reports.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toMillis(doc.data().createdAt),
        })),
    });
});

/**
 * Resolves a queue row.
 *
 * `dismiss` keeps the content up; `remove` takes it down (see the moderation
 * route). Either way the decision, the reason and who made it are recorded — a
 * dismissal is a decision too, and the next moderator needs to see it.
 */
export const PATCH = withAdmin("reports.resolve", async (request, admin, ctx: Ctx) => {
    const { targetKey } = await ctx.params;
    const { resolution, reason } = await request.json();

    if (!["dismissed", "actioned", "escalated"].includes(resolution)) {
        return NextResponse.json({ error: `Invalid resolution "${resolution}"` }, { status: 400 });
    }

    const ref = adminDb.collection("report_targets").doc(targetKey);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const current = snap.data() || {};

    const status = resolution === "escalated" ? "escalated" : "closed";

    await ref.update({
        status,
        resolution,
        resolutionReason: reason || null,
        openCount: 0,
        handledByUid: admin.uid,
        handledByEmail: admin.email,
        handledAt: FieldValue.serverTimestamp(),
    });

    // Close the individual reports so a reporter can see their report was read.
    const reports = await adminDb.collection("reports").where("targetKey", "==", targetKey).where("status", "==", "open").get();
    const batch = adminDb.batch();
    reports.docs.forEach((doc) => batch.update(doc.ref, { status: resolution, handledAt: FieldValue.serverTimestamp() }));
    await batch.commit();

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `report.${resolution}`,
        targetType: "report_target",
        targetId: targetKey,
        targetLabel: `${current.targetType}:${current.targetId}`,
        reason: reason || undefined,
        before: { status: current.status, openCount: current.openCount },
        after: { status, resolution, reportsClosed: reports.size },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, reportsClosed: reports.size });
});
