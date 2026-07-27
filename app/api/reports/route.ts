import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
    highestPriority,
    isReportReason,
    isReportTargetType,
    priorityForReason,
    targetKey,
    type ReportPriority,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

/**
 * User-facing report endpoint.
 *
 * Reports are written server-side rather than straight from the client so that
 * three things can happen atomically-ish: the individual report is recorded, the
 * per-target aggregate the moderation queue reads is updated, and urgent reasons
 * escalate. Firestore rules deny client creates on both collections.
 */
export async function POST(request: Request) {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Sign in to report content" }, { status: 401 });

    let reporterUid: string;
    let reporterEmail: string | null;
    try {
        // checkRevoked so a blocked account can't keep filing reports on the
        // hour its last-issued token still has left.
        const decoded = await adminAuth.verifyIdToken(token, true);
        reporterUid = decoded.uid;
        reporterEmail = decoded.email || null;
    } catch {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, reason, note } = body;

    if (!isReportTargetType(targetType)) {
        return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
    }
    if (!targetId || typeof targetId !== "string") {
        return NextResponse.json({ error: "Missing target" }, { status: 400 });
    }
    if (!isReportReason(reason)) {
        return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    const key = targetKey(targetType, targetId);
    const aggregateRef = adminDb.collection("report_targets").doc(key);

    // One report per person per target. A second attempt is a no-op rather than
    // an error — telling someone "you already reported this" is fine, but
    // letting one account inflate a report count is not.
    const existing = await adminDb
        .collection("reports")
        .where("targetKey", "==", key)
        .where("reporterId", "==", reporterUid)
        .limit(1)
        .get();

    if (!existing.empty) {
        return NextResponse.json({ success: true, duplicate: true });
    }

    // Snapshot enough of the target to review it later, even if it gets edited
    // or deleted in the meantime.
    let targetOwnerId: string | null = null;
    let snapshot: Record<string, unknown> = {};

    if (targetType === "post" || targetType === "comment") {
        const postId = targetType === "post" ? targetId : String(body.postId || "");
        if (postId) {
            const postSnap = await adminDb.collection("connect_posts").doc(postId).get();
            if (postSnap.exists) {
                const p = postSnap.data() || {};
                targetOwnerId = p.authorId || null;
                snapshot = {
                    postId,
                    author: p.author || null,
                    projectName: p.projectName || null,
                    body: p.body || null,
                    lyrics: (p.lyrics || []).slice(0, 12),
                    attachment: p.attachment || null,
                };
                if (targetType === "comment") {
                    const comment = (p.comments || []).find((c: any) => c.id === targetId);
                    if (comment) {
                        targetOwnerId = comment.authorId || targetOwnerId;
                        snapshot = { ...snapshot, comment: { author: comment.author, body: comment.body } };
                    }
                }
            }
        }
    } else if (targetType === "song") {
        const projectSnap = await adminDb.collection("projects").doc(targetId).get();
        if (projectSnap.exists) {
            const p = projectSnap.data() || {};
            targetOwnerId = p.ownerId || null;
            snapshot = { title: p.title || p.name || null, ownerId: p.ownerId || null };
        }
    } else if (targetType === "profile") {
        targetOwnerId = targetId;
        const userSnap = await adminDb.collection("users").doc(targetId).get();
        if (userSnap.exists) snapshot = { name: userSnap.data()?.name || null };
    }

    if (targetOwnerId === reporterUid) {
        return NextResponse.json({ error: "You can't report your own content" }, { status: 400 });
    }

    const priority = priorityForReason(reason);
    const now = FieldValue.serverTimestamp();

    await adminDb.collection("reports").add({
        targetKey: key,
        targetType,
        targetId,
        targetOwnerId,
        reporterId: reporterUid,
        reporterEmail,
        reason,
        note: typeof note === "string" ? note.slice(0, 1000) : null,
        priority,
        status: "open",
        createdAt: now,
    });

    const aggregateSnap = await aggregateRef.get();
    if (aggregateSnap.exists) {
        const current = aggregateSnap.data() || {};
        await aggregateRef.update({
            openCount: FieldValue.increment(1),
            totalCount: FieldValue.increment(1),
            [`reasons.${reason}`]: FieldValue.increment(1),
            priority: highestPriority((current.priority as ReportPriority) || "normal", priority),
            lastReportedAt: now,
            // A new report on something already handled reopens it: the decision
            // may have been right at the time, but fresh reports deserve a look.
            status: current.status === "open" ? "open" : "reopened",
            snapshot: Object.keys(snapshot).length > 0 ? snapshot : current.snapshot || {},
        });
    } else {
        await aggregateRef.set({
            targetKey: key,
            targetType,
            targetId,
            targetOwnerId,
            snapshot,
            openCount: 1,
            totalCount: 1,
            reasons: { [reason]: 1 },
            priority,
            status: "open",
            firstReportedAt: now,
            lastReportedAt: now,
            resolution: null,
            handledByUid: null,
            handledByEmail: null,
            handledAt: null,
        });
    }

    // Keep a counter on the post itself so the feed can react (and so the
    // projects rule can let a moderator read a reported song).
    if (targetType === "post") {
        await adminDb.collection("connect_posts").doc(targetId)
            .update({ reportCount: FieldValue.increment(1) })
            .catch(() => {});
    } else if (targetType === "song") {
        await adminDb.collection("projects").doc(targetId)
            .update({ reportCount: FieldValue.increment(1) })
            .catch(() => {});
    }

    return NextResponse.json({ success: true, priority });
}
