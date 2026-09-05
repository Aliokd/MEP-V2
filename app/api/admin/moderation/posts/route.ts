import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "number") return value;
    return null;
}

/** Live feed monitor: the community feed as moderators need to see it. */
export const GET = withAdmin("community.read", async (request) => {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "recent";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    if (view === "removed") {
        const snap = await adminDb.collection("moderated_posts").orderBy("removedAt", "desc").limit(limit).get();
        return NextResponse.json({
            posts: snap.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    removed: true,
                    author: d.author,
                    authorId: d.authorId || null,
                    projectName: d.projectName,
                    body: d.body,
                    lyrics: d.lyrics || [],
                    reportCount: d.reportCount || 0,
                    removedAt: toMillis(d.removedAt),
                    removedByEmail: d.removedByEmail || null,
                    removalReason: d.removalReason || null,
                    createdAt: d.createdAt || null,
                };
            }),
        });
    }

    let query: FirebaseFirestore.Query = adminDb.collection("connect_posts");
    if (view === "reported") {
        query = query.where("reportCount", ">", 0).orderBy("reportCount", "desc");
    } else {
        query = query.orderBy("createdAt", "desc");
    }

    const snap = await query.limit(limit).get();
    return NextResponse.json({
        posts: snap.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                removed: false,
                author: d.author,
                authorId: d.authorId || null,
                avatarFallback: d.avatarFallback || null,
                projectName: d.projectName,
                body: d.body,
                lyrics: d.lyrics || [],
                attachment: d.attachment || null,
                kudos: d.kudos || 0,
                commentCount: (d.comments || []).length,
                reportCount: d.reportCount || 0,
                isSeed: d.isSeed === true,
                createdAt: d.createdAt || null,
            };
        }),
    });
});

/**
 * Removes a post from the feed, or restores one.
 *
 * Removal *moves* the document to `moderated_posts` rather than flagging it in
 * place: ConnectTab subscribes to the whole feed collection unfiltered, and a
 * rule that hid flagged rows would fail the entire query for every user. Moving
 * it also means removed content genuinely leaves the collection clients read.
 */
export const POST = withAdmin("community.moderate", async (request, admin) => {
    const { postId, action, reason, notify = true } = await request.json();

    if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });
    if (!["remove", "restore"].includes(action)) {
        return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 });
    }
    if (action === "remove" && (!reason || !String(reason).trim())) {
        return NextResponse.json({ error: "A reason is required. The author is told why" }, { status: 400 });
    }

    const liveRef = adminDb.collection("connect_posts").doc(postId);
    const removedRef = adminDb.collection("moderated_posts").doc(postId);

    if (action === "remove") {
        const snap = await liveRef.get();
        if (!snap.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });
        const post = snap.data() || {};

        await removedRef.set({
            ...post,
            removedAt: FieldValue.serverTimestamp(),
            removedByUid: admin.uid,
            removedByEmail: admin.email,
            removalReason: String(reason).trim(),
        });
        await liveRef.delete();

        let notified = false;
        // Why the author was or wasn't emailed, so the console can say so instead
        // of leaving the moderator to assume it worked. Posts shared before
        // 2026-07-26 carry no authorId, so there is nobody to write to — that was
        // silently skipping the whole block and reporting success.
        let notifyStatus:
            | "sent"
            | "skipped"
            | "no-author-id"
            | "no-account"
            | "no-email"
            | "send-failed" = "skipped";
        // The actual SMTP diagnosis, so the console can say what to fix rather
        // than only that something went wrong.
        let notifyError: string | null = null;

        if (!notify) {
            notifyStatus = "skipped";
        } else if (!post.authorId) {
            notifyStatus = "no-author-id";
        } else {
            const authorSnap = await adminDb.collection("users").doc(post.authorId).get();
            const email = authorSnap.exists ? authorSnap.data()?.email : null;

            if (!authorSnap.exists) {
                notifyStatus = "no-account";
            } else if (!email) {
                notifyStatus = "no-email";
            } else {
                try {
                    await sendMail({
                        to: email,
                        subject: "A post of yours was removed from Connect",
                        text: `We removed one of your posts from the Veinote community feed.

Post: ${post.projectName || "Untitled"}

Reason given by our moderation team:
------------------------------------------
${String(reason).trim()}
------------------------------------------

Your song itself is untouched. This only affects what was shared to Connect.

If you think this is wrong, reply to this email and a person will review it. Appeals are read by someone other than the moderator who made the decision.

Veinote`,
                    });
                    notified = true;
                    notifyStatus = "sent";
                } catch (err: any) {
                    console.error("[moderation] Failed to notify author:", err);
                    notifyStatus = "send-failed";
                    notifyError = err?.message || "Unknown mail error";
                }
            }
        }

        await adminDb.collection("moderation_actions").add({
            action: "post.remove",
            postId,
            authorId: post.authorId || null,
            reason: String(reason).trim(),
            actorUid: admin.uid,
            actorEmail: admin.email,
            notified,
            createdAt: FieldValue.serverTimestamp(),
        });

        await writeAudit({
            actorUid: admin.uid,
            actorEmail: admin.email,
            actorRole: admin.role,
            action: "post.remove",
            targetType: "post",
            targetId: postId,
            targetLabel: `${post.author || "?"}: ${post.projectName || "Untitled"}`,
            reason: String(reason).trim(),
            after: { notified, notifyStatus, notifyError },
            ...auditContext(request),
        });

        return NextResponse.json({ success: true, notified, notifyStatus, notifyError });
    }

    // Restore
    const snap = await removedRef.get();
    if (!snap.exists) return NextResponse.json({ error: "Removed post not found" }, { status: 404 });
    const post = snap.data() || {};

    const { removedAt, removedByUid, removedByEmail, removalReason, ...original } = post;
    await liveRef.set({ ...original, restoredAt: FieldValue.serverTimestamp() });
    await removedRef.delete();

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "post.restore",
        targetType: "post",
        targetId: postId,
        targetLabel: `${post.author || "?"}: ${post.projectName || "Untitled"}`,
        reason: reason || undefined,
        before: { removedByEmail, removalReason },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
