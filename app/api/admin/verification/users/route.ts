import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { readDocs } from "@/lib/admin/batchRead";

export const dynamic = "force-dynamic";

/**
 * Every account, with whether it carries the verified mark.
 *
 * Returned in one page and filtered in the browser: the whole list is a few
 * dozen rows, and searching a list that is already in hand beats a round trip
 * per keystroke. CAP is the point at which that stops being true — past it the
 * response says so rather than quietly showing a slice.
 */
const CAP = 500;

function toMillis(value: unknown): number | null {
    if (!value) return null;
    if (typeof (value as any)?.toMillis === "function") return (value as any).toMillis();
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}

export const GET = withAdmin("users.read", async () => {
    // Deliberately unordered. Firestore drops any document missing the field an
    // orderBy names, without an error — ordering on createdAt here would simply
    // omit every account that predates the field, and this list's whole job is
    // to be the complete one. Sorted below instead, where a missing date is a
    // row at the bottom rather than a row that vanishes.
    const snap = await adminDb.collection("users").limit(CAP + 1).get();
    const docs = snap.docs.slice(0, CAP);
    const uids = docs.map((d) => d.id);

    const [profiles, requests] = await Promise.all([
        readDocs("publicProfiles", uids),
        readDocs("verification_requests", uids),
    ]);

    const rows = docs.map((doc) => {
        const user = doc.data() || {};
        const profile = profiles.get(doc.id) || {};
        const request = requests.get(doc.id);

        return {
            uid: doc.id,
            name: (profile.name || user.name || user.displayName || "").trim(),
            email: user.email || "",
            photoURL: profile.photoURL || user.photoURL || "",
            createdAt: toMillis(user.createdAt),
            verified: profile.verified === true,
            verifiedAt: typeof profile.verifiedAt === "number" ? profile.verifiedAt : null,
            /** "pending" | "approved" | "declined", or null when they never asked. */
            requestStatus: (request?.status as string) || null,
            grantedByAdmin: request?.grantedByAdmin === true,
        };
    });

    rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return NextResponse.json({
        users: rows,
        total: rows.length,
        truncated: snap.docs.length > CAP,
        cap: CAP,
    });
});
