import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { OFFBOARDING_REASONS, type OffboardingKind, type OffboardingRecord } from "@/lib/offboarding";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const LIMIT = 300;

/**
 * Who left and why: the offboarding records the cancel and delete routes
 * write, newest first, with the reasons tallied per kind so the page can
 * show what is driving departures without reading every row.
 *
 * `users.read` rather than a permission of its own: support answers the
 * "why did they leave?" question as often as anyone, and the rows carry
 * nothing a user lookup does not already show.
 */
export const GET = withAdmin("users.read", async () => {
    const snap = await adminDb.collection("offboarding").orderBy("createdAt", "desc").limit(LIMIT).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as OffboardingRecord) }));

    const since30d = new Date(Date.now() - 30 * DAY).toISOString();
    const emptyTally = () => Object.fromEntries(OFFBOARDING_REASONS.map((r) => [r, 0])) as Record<string, number>;
    const reasons: Record<OffboardingKind, Record<string, number>> = { cancel: emptyTally(), delete: emptyTally() };
    const totals: Record<OffboardingKind, { all: number; last30d: number }> = {
        cancel: { all: 0, last30d: 0 },
        delete: { all: 0, last30d: 0 },
    };
    let withNote = 0;

    for (const row of rows) {
        const kind: OffboardingKind = row.kind === "cancel" ? "cancel" : "delete";
        totals[kind].all += 1;
        if (row.createdAt >= since30d) totals[kind].last30d += 1;
        for (const reason of row.reasons ?? []) {
            if (reason in reasons[kind]) reasons[kind][reason] += 1;
        }
        if (row.note) withNote += 1;
    }

    return NextResponse.json({
        rows,
        totals,
        reasons,
        withNote,
        truncated: snap.size === LIMIT,
        note: `The ${LIMIT} most recent departures. Tallies cover these rows only.`,
    });
});
