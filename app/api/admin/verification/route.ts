import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { readDocs } from "@/lib/admin/batchRead";

export const dynamic = "force-dynamic";

interface Row {
    uid: string;
    name: string;
    bio: string;
    photoURL: string;
    status: string;
    submittedAt: number;
    reviewedAt: number | null;
    verifiedAt: number | null;
    note: string | null;
    grantedByAdmin: boolean;
    /** False when this person carries the mark without ever having filed a request. */
    requested: boolean;
}

/**
 * Verification requests, newest first.
 *
 * Pending and declined are questions, so they are read from the request
 * documents. Approved is not a question but a state of the world, and the field
 * that holds it is `publicProfiles.verified` — an account can carry the mark
 * with no request behind it, from this console's direct-verify or from
 * scripts/verify-user.mjs. Listing approvals from the request collection
 * therefore under-reports the answer to "who is verified", which is the only
 * thing that tab is asked. So it is read from the seal, and whatever request
 * exists is merged in for the biography and the decision date.
 *
 * Read through the Admin SDK: the request documents are owner-readable only on
 * the client side, and the console must not depend on a broad client rule to
 * see them.
 */
export const GET = withAdmin("users.read", async (request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";

    if (status === "approved") return NextResponse.json({ requests: await approvedRows() });

    const snap = await adminDb
        .collection("verification_requests")
        .where("status", "==", status)
        .limit(200)
        .get();

    const rows: Row[] = snap.docs.map((d) => {
        const data = d.data();
        return {
            uid: d.id,
            name: data.name ?? "",
            bio: data.bio ?? "",
            photoURL: data.photoURL ?? "",
            status: data.status ?? "pending",
            submittedAt: typeof data.submittedAt === "number" ? data.submittedAt : 0,
            reviewedAt: typeof data.reviewedAt === "number" ? data.reviewedAt : null,
            verifiedAt: null,
            note: data.note ?? null,
            // True when an admin verified this account directly rather than the
            // songwriter asking. Shown as a badge, so the queue never implies a
            // request that was never filed.
            grantedByAdmin: data.grantedByAdmin === true,
            requested: true,
        };
    });
    rows.sort((a, b) => b.submittedAt - a.submittedAt);

    return NextResponse.json({ requests: rows });
});

/** Everyone carrying the mark, whether or not they ever asked for it. */
async function approvedRows(): Promise<Row[]> {
    const snap = await adminDb.collection("publicProfiles").where("verified", "==", true).limit(500).get();
    const uids = snap.docs.map((d) => d.id);

    const [requests, users] = await Promise.all([
        readDocs("verification_requests", uids),
        readDocs("users", uids),
    ]);

    const rows: Row[] = snap.docs.map((doc) => {
        const profile = doc.data() || {};
        const req = requests.get(doc.id);
        const user = users.get(doc.id) || {};
        const verifiedAt = typeof profile.verifiedAt === "number" ? profile.verifiedAt : null;

        return {
            uid: doc.id,
            name: (profile.name || req?.name || user.name || user.displayName || "").trim(),
            bio: req?.bio ?? "",
            photoURL: profile.photoURL || req?.photoURL || user.photoURL || "",
            status: "approved",
            submittedAt: typeof req?.submittedAt === "number" ? req.submittedAt : 0,
            reviewedAt: typeof req?.reviewedAt === "number" ? req.reviewedAt : null,
            verifiedAt,
            note: req?.note ?? null,
            grantedByAdmin: req?.grantedByAdmin === true,
            requested: Boolean(req) && req?.grantedByAdmin !== true,
        };
    });

    // Newest approval first. A seal written before the stamp existed sorts last
    // rather than jumping to the top on a zero.
    rows.sort((a, b) => (b.verifiedAt ?? 0) - (a.verifiedAt ?? 0));
    return rows;
}
