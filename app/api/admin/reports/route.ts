import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "number") return value;
    return null;
}

const PRIORITY_RANK: Record<string, number> = { urgent: 2, high: 1, normal: 0 };

/**
 * The moderation queue: one row per reported thing, not per report.
 *
 * Ordering is deliberate — urgency first (a self-harm report can't sit behind
 * forty spam flags), then how many people reported it, then age.
 */
export const GET = withAdmin("reports.read", async (request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "open";
    const targetType = url.searchParams.get("targetType");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 300);

    let query: FirebaseFirestore.Query = adminDb.collection("report_targets");

    if (status === "open") {
        query = query.where("status", "in", ["open", "reopened"]);
    } else if (status !== "all") {
        query = query.where("status", "==", status);
    }
    if (targetType) query = query.where("targetType", "==", targetType);

    const snap = await query.limit(limit).get().catch((err) => {
        console.warn("[reports] query failed:", err.message);
        return null;
    });

    const items = (snap?.docs || []).map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            targetType: d.targetType,
            targetId: d.targetId,
            targetOwnerId: d.targetOwnerId || null,
            snapshot: d.snapshot || {},
            openCount: d.openCount || 0,
            totalCount: d.totalCount || 0,
            reasons: d.reasons || {},
            priority: d.priority || "normal",
            status: d.status || "open",
            resolution: d.resolution || null,
            handledByEmail: d.handledByEmail || null,
            firstReportedAt: toMillis(d.firstReportedAt),
            lastReportedAt: toMillis(d.lastReportedAt),
            handledAt: toMillis(d.handledAt),
        };
    });

    items.sort((a, b) => {
        const byPriority = (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0);
        if (byPriority !== 0) return byPriority;
        if (b.openCount !== a.openCount) return b.openCount - a.openCount;
        return (a.firstReportedAt || 0) - (b.firstReportedAt || 0);
    });

    return NextResponse.json({ items });
});
