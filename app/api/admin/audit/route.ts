import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export const GET = withAdmin("audit.read", async (request) => {
    const url = new URL(request.url);
    const actor = url.searchParams.get("actor");
    const targetType = url.searchParams.get("targetType");
    const action = url.searchParams.get("action");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
    const before = Number(url.searchParams.get("before")) || null;

    let query: FirebaseFirestore.Query = adminDb.collection("admin_audit_log");
    if (actor) query = query.where("actorEmail", "==", actor);
    if (targetType) query = query.where("targetType", "==", targetType);
    if (action) query = query.where("action", "==", action);

    query = query.orderBy("createdAt", "desc");
    if (before) query = query.startAfter(new Date(before));

    const snap = await query.limit(limit).get();

    const entries = snap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            action: d.action,
            actorEmail: d.actorEmail,
            actorRole: d.actorRole,
            targetType: d.targetType,
            targetId: d.targetId,
            targetLabel: d.targetLabel || d.targetId,
            reason: d.reason || null,
            before: d.before || null,
            after: d.after || null,
            ip: d.ip || null,
            createdAt: d.createdAt?.toMillis?.() ?? null,
        };
    });

    return NextResponse.json({
        entries,
        nextCursor: entries.length === limit ? entries[entries.length - 1].createdAt : null,
    });
});
