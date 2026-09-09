import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/** Enough to verify a launch cohort in one go, few enough that it stays a deliberate act. */
const MAX_PER_CALL = 50;

/**
 * Verifies chosen accounts directly, without them having asked.
 *
 * The queue in ../route.ts answers requests; this is the other direction — an
 * artist the team already knows, verified because someone decided to. It writes
 * the same seal the approve path writes (`publicProfiles.verified` with its
 * `verifiedAt` stamp), which is what every surface reads and what makes the
 * congratulations popup appear for them, live if they are in the app and on
 * their next visit otherwise.
 *
 * An account that already carries the seal is left alone rather than re-stamped:
 * a new stamp would replay a popup they have already seen and dismissed.
 *
 * A matching `verification_requests` document is written so the person appears
 * in the Approved tab like anyone else, marked `grantedByAdmin` so the console
 * never implies they filed a request they did not file.
 */
export const POST = withAdmin("users.write", async (request, admin) => {
    const body = (await request.json().catch(() => ({}))) as { uids?: unknown; note?: unknown };
    const uids = Array.isArray(body.uids)
        ? [...new Set(body.uids.filter((u): u is string => typeof u === "string" && u.length > 0))]
        : [];
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    if (uids.length === 0) {
        return NextResponse.json({ error: "Choose at least one person to verify" }, { status: 400 });
    }
    if (uids.length > MAX_PER_CALL) {
        return NextResponse.json({ error: `Verify up to ${MAX_PER_CALL} people at a time` }, { status: 400 });
    }

    const results: { uid: string; name: string; status: "verified" | "already verified" | "no such account" }[] = [];

    for (const uid of uids) {
        const [userSnap, profileSnap, requestSnap] = await Promise.all([
            adminDb.collection("users").doc(uid).get(),
            adminDb.collection("publicProfiles").doc(uid).get(),
            adminDb.collection("verification_requests").doc(uid).get(),
        ]);

        if (!userSnap.exists) {
            results.push({ uid, name: "", status: "no such account" });
            continue;
        }

        const user = userSnap.data() || {};
        const profile = profileSnap.data() || {};
        const existingRequest = requestSnap.data() || {};
        const name = (profile.name || user.name || user.displayName || "").trim();

        if (profile.verified === true) {
            results.push({ uid, name, status: "already verified" });
            continue;
        }

        const now = Date.now();
        const photoURL = profile.photoURL || user.photoURL || "";

        const batch = adminDb.batch();
        // Merged, and carrying the display fields when the mirror does not exist
        // yet: a profile document holding nothing but `verified` would be a
        // nameless card everywhere it is read.
        batch.set(
            adminDb.collection("publicProfiles").doc(uid),
            { uid, verified: true, verifiedAt: now, ...(profile.name ? {} : name ? { name } : {}), ...(profile.photoURL || !photoURL ? {} : { photoURL }) },
            { merge: true },
        );
        batch.set(
            adminDb.collection("verification_requests").doc(uid),
            {
                uid,
                name,
                photoURL,
                bio: existingRequest.bio ?? "",
                status: "approved",
                grantedByAdmin: true,
                submittedAt: typeof existingRequest.submittedAt === "number" ? existingRequest.submittedAt : now,
                reviewedAt: now,
                reviewedBy: admin.uid,
                ...(note ? { note } : {}),
            },
            { merge: true },
        );
        await batch.commit();

        await writeAudit({
            actorUid: admin.uid,
            actorEmail: admin.email,
            actorRole: admin.role,
            action: "verification.grant",
            targetType: "user",
            targetId: uid,
            targetLabel: name || uid,
            after: { verified: true, requested: requestSnap.exists },
            ...(note ? { details: { note } } : {}),
            ...auditContext(request),
        });

        results.push({ uid, name, status: "verified" });
    }

    return NextResponse.json({
        success: true,
        results,
        verified: results.filter((r) => r.status === "verified").length,
    });
});
