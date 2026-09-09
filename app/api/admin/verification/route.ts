import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Verification requests, pending first, newest first within each status.
 *
 * Read through the Admin SDK: the request documents are owner-readable only on
 * the client side, and the console must not depend on a broad client rule to
 * see them.
 */
export const GET = withAdmin("users.read", async (request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";

    const snap = await adminDb
        .collection("verification_requests")
        .where("status", "==", status)
        .limit(200)
        .get();

    const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
            uid: d.id,
            name: data.name ?? "",
            bio: data.bio ?? "",
            photoURL: data.photoURL ?? "",
            status: data.status ?? "pending",
            submittedAt: typeof data.submittedAt === "number" ? data.submittedAt : 0,
            reviewedAt: typeof data.reviewedAt === "number" ? data.reviewedAt : null,
            note: data.note ?? null,
            // True when an admin verified this account directly rather than the
            // songwriter asking. Shown as a badge, so the queue never implies a
            // request that was never filed.
            grantedByAdmin: data.grantedByAdmin === true,
        };
    });
    rows.sort((a, b) => b.submittedAt - a.submittedAt);

    return NextResponse.json({ requests: rows });
});
