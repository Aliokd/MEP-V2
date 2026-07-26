import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { FEATURE_FLAGS, invalidateFlagCache, type FeatureFlag } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

export const GET = withAdmin("ops.read", async () => {
    const snap = await adminDb.collection("feature_flags").get();
    const stored = new Map(snap.docs.map((doc) => [doc.id, doc.data()]));

    // Every known flag is listed whether or not a document exists yet — an
    // absent document means "on", and hiding that would make the page lie.
    const flags = Object.entries(FEATURE_FLAGS).map(([id, label]) => {
        const d = stored.get(id);
        return {
            id,
            label,
            enabled: d ? d.enabled !== false : true,
            reason: d?.reason || null,
            updatedByEmail: d?.updatedByEmail || null,
            updatedAt: d?.updatedAt?.toMillis?.() ?? null,
        };
    });

    return NextResponse.json({ flags });
});

export const PATCH = withAdmin("ops.write", async (request, admin) => {
    const { flag, enabled, reason } = await request.json();

    if (!(flag in FEATURE_FLAGS)) {
        return NextResponse.json({ error: `Unknown flag "${flag}"` }, { status: 400 });
    }
    if (typeof enabled !== "boolean") {
        return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    if (!enabled && !String(reason || "").trim()) {
        return NextResponse.json({ error: "Say why you're switching this off" }, { status: 400 });
    }

    const ref = adminDb.collection("feature_flags").doc(flag);
    const before = (await ref.get()).data();

    await ref.set(
        {
            enabled,
            reason: reason || null,
            label: FEATURE_FLAGS[flag as FeatureFlag],
            updatedByEmail: admin.email,
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );

    invalidateFlagCache();

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: enabled ? "flag.enable" : "flag.disable",
        targetType: "feature_flag",
        targetId: flag,
        targetLabel: FEATURE_FLAGS[flag as FeatureFlag],
        reason: reason || undefined,
        before: { enabled: before ? before.enabled !== false : true },
        after: { enabled },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
