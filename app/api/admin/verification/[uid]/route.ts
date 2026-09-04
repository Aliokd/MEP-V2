import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

/**
 * The decision. Approving is the one place `publicProfiles.verified` is set
 * from the console — the client rules leave that field out of the owner's
 * write whitelist precisely so this route (and the seed script) are its only
 * writers. Declining records a note the songwriter sees on their profile.
 */
export const POST = withAdmin("users.write", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { decision?: string; note?: string };
    const decision = body.decision;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    if (decision !== "approve" && decision !== "decline") {
        return NextResponse.json({ error: "decision must be approve or decline" }, { status: 400 });
    }

    const reqRef = adminDb.collection("verification_requests").doc(uid);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
        return NextResponse.json({ error: "No verification request for that user" }, { status: 404 });
    }

    const approved = decision === "approve";
    const now = Date.now();

    const batch = adminDb.batch();
    batch.set(reqRef, {
        status: approved ? "approved" : "declined",
        reviewedAt: now,
        reviewedBy: admin.uid,
        note: note || FieldValue.delete(),
    }, { merge: true });
    batch.set(adminDb.collection("publicProfiles").doc(uid), {
        verified: approved,
        verifiedAt: approved ? now : FieldValue.delete(),
    }, { merge: true });
    await batch.commit();

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: approved ? "verification.approve" : "verification.decline",
        targetType: "user",
        targetId: uid,
        ...(note ? { details: { note } } : {}),
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, status: approved ? "approved" : "declined" });
});
